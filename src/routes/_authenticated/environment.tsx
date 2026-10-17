import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Droplets, Thermometer } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/lib/auth";
import { useDevices, useProfile, useReadings } from "@/lib/data";
import { DEVICE_ONLINE_MS } from "@/lib/constants";
import { PageHeader, SimBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/environment")({
  head: () => ({ meta: [{ title: "Wardrobe environment — ClosetIQ" }, { name: "description", content: "Temperature and humidity inside your wardrobe." }, { property: "og:title", content: "Wardrobe environment — ClosetIQ" }, { property: "og:description", content: "Wardrobe climate monitoring." }] }),
  component: Env,
});

function Env() {
  const uid = useUserId();
  const qc = useQueryClient();
  const { data: readings = [] } = useReadings(100);
  const { data: profile } = useProfile();
  const { data: devices = [] } = useDevices();
  const [view, setView] = useState<"real" | "sim">("real");
  const [t, setT] = useState("24");
  const [h, setH] = useState("60");
  const [hum, setHum] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);

  const list = readings.filter((r) => (view === "sim" ? r.is_simulated : !r.is_simulated));
  const latest = list[0];
  const hThr = Number(hum ?? profile?.humidity_threshold ?? 65);
  const tThr = Number(temp ?? profile?.temp_high_threshold ?? 32);
  const online = devices.some((d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_MS);
  const chart = [...list].reverse().map((r) => ({ time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), temperature: Number(r.temperature), humidity: Number(r.humidity) }));

  async function addSim() {
    const tn = Number(t), hn = Number(h);
    if (Number.isNaN(tn) || tn < -40 || tn > 85 || Number.isNaN(hn) || hn < 0 || hn > 100) return toast.error("Temperature -40–85 °C, humidity 0–100 %");
    const { error } = await supabase.from("sensor_readings").insert({ user_id: uid, temperature: tn, humidity: hn, is_simulated: true });
    if (error) return toast.error("Couldn't add reading");
    setView("sim");
    qc.invalidateQueries({ queryKey: ["readings"] });
    return undefined;
  }
  async function saveThresholds() {
    const { error } = await supabase.from("profiles").update({ humidity_threshold: hThr, temp_high_threshold: tThr }).eq("id", uid);
    if (error) return toast.error("Couldn't save");
    toast.success("Thresholds saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
    return undefined;
  }

  return (
    <>
      <PageHeader title="Wardrobe environment" subtitle={`Sensor device: ${devices.length === 0 ? "none registered" : online ? "online" : "offline"}`}
        action={<Tabs value={view} onValueChange={(v) => setView(v as "real" | "sim")}><TabsList><TabsTrigger value="real">Sensor data</TabsTrigger><TabsTrigger value="sim">Simulated</TabsTrigger></TabsList></Tabs>} />

      {!latest ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          {view === "real" ? "Waiting for sensor data. Connect the ESP32 sensor to start receiving readings." : "No simulated readings yet — add one below."}
        </div>
      ) : (
        <>
          {Number(latest.humidity) > hThr && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning p-4 text-warning-foreground"><AlertTriangle className="h-5 w-5" />Humidity {Number(latest.humidity)}% is above your {hThr}% threshold — risk of mould and odour. Ventilate the wardrobe.</div>
          )}
          {Number(latest.temperature) > tThr && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning p-4 text-warning-foreground"><AlertTriangle className="h-5 w-5" />Temperature {Number(latest.temperature)}°C is above {tThr}°C.</div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={<Thermometer />} label="Temperature" value={`${Number(latest.temperature)}°C`} sim={latest.is_simulated} />
            <Stat icon={<Droplets />} label="Humidity" value={`${Number(latest.humidity)}%`} sim={latest.is_simulated} />
            <div className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Last update</p><p className="mt-1 font-semibold">{new Date(latest.created_at).toLocaleString()}</p></div>
          </div>
          {chart.length > 1 && (
            <div className="mt-6 h-72 rounded-2xl border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <XAxis dataKey="time" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke="var(--chart-2)" strokeWidth={2} dot={false} name="°C" />
                  <Line type="monotone" dataKey="humidity" stroke="var(--chart-1)" strokeWidth={2} dot={false} name="%RH" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl">Warning thresholds</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Max humidity %</Label><Input type="number" value={hum ?? String(profile?.humidity_threshold ?? 65)} onChange={(e) => setHum(e.target.value)} /></div>
            <div><Label>Max temperature °C</Label><Input type="number" value={temp ?? String(profile?.temp_high_threshold ?? 32)} onChange={(e) => setTemp(e.target.value)} /></div>
          </div>
          <Button className="mt-4" onClick={saveThresholds}>Save thresholds</Button>
        </section>
        <section className="rounded-2xl border-2 border-dashed border-warning-foreground/30 bg-card p-6">
          <div className="mb-4 flex items-center gap-2"><h2 className="text-xl">Simulate a reading</h2><SimBadge /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Temperature °C</Label><Input type="number" value={t} onChange={(e) => setT(e.target.value)} /></div>
            <div><Label>Humidity %</Label><Input type="number" value={h} onChange={(e) => setH(e.target.value)} /></div>
          </div>
          <Button className="mt-4" variant="outline" onClick={addSim}>Add simulated reading</Button>
        </section>
      </div>
    </>
  );
}

function Stat({ icon, label, value, sim }: { icon: React.ReactNode; label: string; value: string; sim: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs uppercase tracking-wide">{label}</span><span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span></div>
      <p className="mt-1 font-display text-4xl">{value}</p>
      {sim && <div className="mt-2"><SimBadge /></div>}
    </div>
  );
}
