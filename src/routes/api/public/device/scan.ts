import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateDevice, json } from "@/lib/device-auth.server";

const Body = z.object({
  device_id: z.string().trim().min(3).max(40),
  uid: z.string().trim().toUpperCase().regex(/^[0-9A-F]{4,20}$/),
  event_type: z.enum(["scan", "check_in", "check_out"]).default("scan"),
  timestamp: z.string().datetime().optional(),
  request_id: z.string().max(64).optional(),
});

export const Route = createFileRoute("/api/public/device/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch (e) {
          return json({ error: "invalid_payload", details: e instanceof z.ZodError ? e.issues : undefined }, 400);
        }
        const auth = await authenticateDevice(request, body.device_id);
        if ("error" in auth) return auth.error;
        const { device, admin } = auth;

        // Duplicate protection: explicit request_id, or same UID from same device within 3s.
        const since = new Date(Date.now() - 3000).toISOString();
        const dupQuery = admin.from("scan_events").select("id,result,clothing_item_id").eq("device_id", device.id);
        const { data: dup } = body.request_id
          ? await dupQuery.eq("request_id", body.request_id).maybeSingle()
          : await dupQuery.eq("uid", body.uid).gte("created_at", since).limit(1).maybeSingle();
        if (dup) return json({ status: "duplicate", result: dup.result, clothing_item_id: dup.clothing_item_id }, 200);

        const { data: tag } = await admin.from("rfid_tags").select("clothing_item_id")
          .eq("uid", body.uid).eq("user_id", device.user_id).eq("is_active", true).maybeSingle();

        let item = null as null | Record<string, unknown>;
        if (tag) {
          const { data: it } = await admin.from("clothing_items")
            .select("id,name,category,color,season,occasions,availability_status,laundry_status").eq("id", tag.clothing_item_id).single();
          item = it;
          if (it && body.event_type !== "scan") {
            const status = body.event_type === "check_out" ? "in_use" : "available";
            await admin.from("clothing_items").update({ availability_status: status }).eq("id", it.id);
            item = { ...it, availability_status: status };
          }
        }

        await admin.from("scan_events").insert({
          user_id: device.user_id, device_id: device.id, uid: body.uid,
          clothing_item_id: (item?.["id"] as string) ?? null, event_type: body.event_type,
          result: item ? "recognized" : "unknown_tag", is_simulated: false, request_id: body.request_id ?? null,
        });

        if (!item) return json({ status: "unknown_tag", uid: body.uid }, 404);
        return json({ status: "recognized", event_type: body.event_type, item }, 200);
      },
    },
  },
});
