import { sha256Hex, timingSafeEqualHex } from "./hash";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Authenticates an ESP32 by device_identifier + per-device key (Authorization: Bearer or X-Device-Key). */
export async function authenticateDevice(request: Request, deviceIdentifier: string) {
  const header = request.headers.get("authorization");
  const key = header?.startsWith("Bearer ") ? header.slice(7).trim() : request.headers.get("x-device-key")?.trim();
  if (!key) return { error: json({ error: "missing_device_key" }, 401) } as const;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: device } = await supabaseAdmin
    .from("devices").select("id,user_id,api_key_hash").eq("device_identifier", deviceIdentifier).maybeSingle();
  const hash = await sha256Hex(key);
  if (!device || !timingSafeEqualHex(hash, device.api_key_hash)) return { error: json({ error: "invalid_device_credentials" }, 401) } as const;
  await supabaseAdmin.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  return { device, admin: supabaseAdmin } as const;
}
