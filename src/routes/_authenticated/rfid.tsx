import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Copy, HelpCircle, Radio, RefreshCw, Wifi, WifiOff, XCircle } from "lucide-react";
import { useDevices, useItems, useScans, useTags } from "@/lib/data";
import { registerDevice, simulateScan } from "@/lib/devices.functions";
import { DEVICE_ONLINE_MS, label } from "@/lib/constants";
import { PageHeader, SimBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/rfid")({
  head: () => ({ meta: [{ title: "RFID scanner — ClosetIQ" }, { name: "description", content: "ESP32 RFID reader status, scans and simulation mode." }, { property: "og:title", content: "RFID scanner — ClosetIQ" }, { property: "og:description", content: "RFID hardware dashboard." }] }),
  component: Rfid,
});

function Rfid() {
  const qc = useQueryClient();
  const { data: devices = [], refetch: rd } = useDevices();
  const { data: scans = [], isError, refetch: rs, isFetching } = useScans(25);
  const { data: items = [] } = useItems();
  const { data: tags = [] } = useTags();
  const sim = useServerFn(simulateScan);
  const reg = useServerFn(registerDevice);
  const byId = new Map(items.map((i) => [i.id, i]));

  const [simUid, setSimUid] = useState("");
  const [mode, setMode] = useState<"scan" | "check_in" | "check_out">("scan");
  const [simResult, setSimResult] = useState<null | { recognized: boolean; name?: string; uid: string }>(null);
  const [dName, setDName] = useState("Wardrobe ESP32");
  const [dId, setDId] = useState("wardrobe-01");
  const [newKey, setNewKey] = useState<string | null>(null);

  const real = scans.filter((s) => !s.is_simulated);
  const lastReal = real[0];
  const online = devices.some((d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_MS);
  const state = isError ? "failed" : devices.length === 0 ? "none" : online ? (lastReal ? (lastReal.result === "recognized" ? "recognized" : "unknown") : "waiting") : "disconnected";

  async function doSim(uid: string) {
    try {
      const r = await sim({ data: { uid, event_type: mode } });
      setSimResult({ recognized: r.recognized, name: r.item?.name, uid: uid.toUpperCase() });
      qc.invalidateQueries({ queryKey: ["scans"] });
      if (mode !== "scan") qc.invalidateQueries({ queryKey: ["items"] });
    } catch (e) {
      toast.error(e instanceof Error && e.message.includes("UID") ? "UID must be 4–20 hex characters" : "Simulated scan failed");
    }
  }

  async function doRegister() {
    try {
      const r = await reg({ data: { device_name: dName, device_identifier: dId } });
      if (!r.ok) return toast.error(r.error);
      setNewKey(r.apiKey); rd();
      toast.success("Device registered — copy its key now");
    } catch { toast.error("Check the device name and ID (3–40 letters, numbers, - or _)."); }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const stateUi = {
    none: { icon: WifiOff, t: "No device registered", c: "bg-muted text-muted-foreground" },
    disconnected: { icon: WifiOff, t: "Disconnected", c: "bg-muted text-muted-foreground" },
    waiting: { icon: Wifi, t: "Connected · waiting for a scan", c: "bg-accent text-accent-foreground" },
    recognized: { icon: CheckCircle2, t: "Connected · tag recognized", c: "bg-accent text-accent-foreground" },
    unknown: { icon: HelpCircle, t: "Connected · unknown tag", c: "bg-warning text-warning-foreground" },
    failed: { icon: XCircle, t: "Request failed", c: "bg-destructive text-destructive-foreground" },
  }[state];

  return (
    <>
      <PageHeader title="RFID scanner" subtitle="ESP32 + RC522 reader. Browsers can't read RFID directly — the ESP32 posts scans to ClosetIQ."
        action={<Button variant="outline" onClick={() => { rs(); rd(); }} disabled={isFetching}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`flex items-center gap-3 rounded-2xl p-5 ${stateUi.c}`}><stateUi.icon className="h-6 w-6" /><div><p className="text-xs uppercase tracking-wide opacity-70">Device status</p><p className="font-semibold">{stateUi.t}</p></div></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Last hardware scan</p><p className="font-semibold">{lastReal ? new Date(lastReal.created_at).toLocaleString() : "None yet"}</p><p className="font-mono text-sm text-muted-foreground">{lastReal?.uid ?? "—"}</p></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Matched item</p><p className="font-semibold">{lastReal ? (lastReal.clothing_item_id ? byId.get(lastReal.clothing_item_id)?.name ?? "Deleted item" : "Unregistered tag") : "—"}</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-dashed border-warning-foreground/30 bg-card p-6">
          <div className="mb-3 flex items-center gap-2"><h2 className="text-xl">Simulation mode</h2><SimBadge /></div>
          <p className="mb-4 text-sm text-muted-foreground">Test scans without hardware. Simulated events are labelled and never mixed with real readings.</p>
          <div className="flex gap-2">
            <Input value={simUid} onChange={(e) => setSimUid(e.target.value.toUpperCase())} placeholder="Tag UID e.g. A1B2C3D4" className="font-mono" />
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="scan">Lookup only</SelectItem><SelectItem value="check_out">Take out</SelectItem><SelectItem value="check_in">Put back</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => doSim(simUid)} disabled={!simUid}>Scan</Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Registered tags:</span>
              {tags.slice(0, 8).map((t) => <button key={t.id} className="rounded bg-secondary px-2 py-0.5 font-mono text-xs hover:bg-accent" onClick={() => { setSimUid(t.uid); doSim(t.uid); }}>{t.uid}</button>)}
            </div>
          )}
          {simResult && (
            <div className={`mt-4 rounded-xl p-3 text-sm ${simResult.recognized ? "bg-accent text-accent-foreground" : "bg-warning text-warning-foreground"}`}>
              {simResult.recognized ? <>Recognized <b>{simResult.name}</b> ({simResult.uid}){mode !== "scan" && ` — marked ${mode === "check_out" ? "in use" : "available"}`}</> : <>Unknown tag <b className="font-mono">{simResult.uid}</b>. Assign it to an item in My Wardrobe.</>}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-3 text-xl">Devices</h2>
          {devices.map((d) => (
            <div key={d.id} className="mb-2 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <span><b>{d.device_name}</b> <span className="font-mono text-muted-foreground">{d.device_identifier}</span></span>
              <span className="text-xs text-muted-foreground">{d.last_seen_at ? `Seen ${new Date(d.last_seen_at).toLocaleString()}` : "Never connected"}</span>
            </div>
          ))}
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><Label className="text-xs">Name</Label><Input value={dName} onChange={(e) => setDName(e.target.value)} /></div>
            <div><Label className="text-xs">Device ID</Label><Input value={dId} onChange={(e) => setDId(e.target.value)} className="font-mono" /></div>
            <Button onClick={doRegister}>Register</Button>
          </div>
          {newKey && (
            <div className="mt-4 rounded-xl bg-warning p-3 text-sm text-warning-foreground">
              <p className="font-semibold">Device key — shown only once. Put it in your ESP32 firmware.</p>
              <div className="mt-2 flex items-center gap-2"><code className="flex-1 break-all rounded bg-card px-2 py-1 text-xs text-foreground">{newKey}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-xl">Recent scan events</h2>
        {scans.length === 0 ? <p className="text-sm text-muted-foreground">No scans yet.</p> : (
          <div className="divide-y text-sm">
            {scans.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{s.uid}</span>
                <span className={s.result === "recognized" ? "text-success" : "text-warning-foreground"}>{s.result === "recognized" ? byId.get(s.clothing_item_id ?? "")?.name ?? "Recognized" : "Unknown tag"}</span>
                <span className="text-muted-foreground">{label(s.event_type)}</span>
                {s.is_simulated && <SimBadge />}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-6 text-sm">
        <h2 className="mb-3 text-xl">Connecting the ESP32</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Wire the RC522 to the ESP32 over SPI (SDA→GPIO5, SCK→18, MOSI→23, MISO→19, RST→22, 3.3V, GND).</li>
          <li>Register a device above and copy its key into the firmware.</li>
          <li>On each tag read, POST JSON to the endpoint below with header <code>Authorization: Bearer &lt;device key&gt;</code>.</li>
          <li><code>event_type</code>: <code>scan</code> (lookup only), <code>check_out</code> (taken out), <code>check_in</code> (put back).</li>
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-primary p-4 text-xs text-primary-foreground">{`POST ${origin}/api/public/device/scan
{
  "device_id": "${dId}",
  "uid": "A1B2C3D4",
  "event_type": "scan",
  "timestamp": "2026-10-17T10:00:00Z",
  "request_id": "optional-unique-id"
}
→ 200 { status: "recognized", item: {...} }
→ 404 { status: "unknown_tag" }
→ 200 { status: "duplicate" }   (same request_id or repeat within 3s)
→ 400 invalid_payload · 401 invalid_device_credentials

POST ${origin}/api/public/device/sensor
{ "device_id": "${dId}", "temperature": 24.5, "humidity": 58 }
→ 201 { status: "stored" }`}</pre>
      </section>
    </>
  );
}
