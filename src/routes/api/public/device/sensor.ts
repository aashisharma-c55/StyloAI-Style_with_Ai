import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateDevice, json } from "@/lib/device-auth.server";

const Body = z.object({
  device_id: z.string().trim().min(3).max(40),
  temperature: z.number().min(-40).max(85),
  humidity: z.number().min(0).max(100),
  timestamp: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/device/sensor")({
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
        const { error } = await auth.admin.from("sensor_readings").insert({
          user_id: auth.device.user_id, device_id: auth.device.id,
          temperature: body.temperature, humidity: body.humidity, is_simulated: false,
        });
        if (error) return json({ error: "storage_failed" }, 500);
        return json({ status: "stored" }, 201);
      },
    },
  },
});
