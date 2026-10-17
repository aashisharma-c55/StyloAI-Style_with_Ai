import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sha256Hex } from "./hash";

/** Registers a device and returns its secret key ONCE. Only the hash is stored. */
export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      device_name: z.string().trim().min(1).max(60),
      device_identifier: z.string().trim().regex(/^[a-zA-Z0-9_-]{3,40}$/, "Use 3–40 letters, numbers, - or _"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "ciq_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("devices").insert({
      user_id: context.userId, device_name: data.device_name, device_identifier: data.device_identifier,
      api_key_hash: await sha256Hex(key),
    });
    if (error) {
      if (error.code === "23505") return { ok: false as const, error: "That device ID is already taken." };
      return { ok: false as const, error: "Could not register device." };
    }
    return { ok: true as const, apiKey: key };
  });

/** Simulation-mode scan. Same lookup as the hardware endpoint, but labelled simulated and never changes inventory unless a mode is chosen. */
export const simulateScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      uid: z.string().trim().toUpperCase().regex(/^[0-9A-F]{4,20}$/, "UID must be 4–20 hex characters"),
      event_type: z.enum(["scan", "check_in", "check_out"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: tag } = await sb.from("rfid_tags").select("clothing_item_id").eq("uid", data.uid).eq("is_active", true).maybeSingle();
    let item: { id: string; name: string; category: string; color: string; availability_status: string } | null = null;
    if (tag) {
      const { data: it } = await sb.from("clothing_items").select("id,name,category,color,availability_status").eq("id", tag.clothing_item_id).single();
      item = it;
      if (item && data.event_type !== "scan") {
        const status = data.event_type === "check_out" ? "in_use" : "available";
        await sb.from("clothing_items").update({ availability_status: status }).eq("id", item.id);
        item = { ...item, availability_status: status };
      }
    }
    await sb.from("scan_events").insert({
      user_id: context.userId, uid: data.uid, clothing_item_id: item?.id ?? null,
      event_type: data.event_type, result: item ? "recognized" : "unknown_tag", is_simulated: true,
    });
    return { recognized: !!item, item };
  });
