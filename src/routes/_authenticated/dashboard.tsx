import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CloudSun, Shirt, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDevices, useItems, useOutfits, useProfile, useReadings, useScans, useWeatherForProfile } from "@/lib/data";
import { DEVICE_ONLINE_MS, label } from "@/lib/constants";
import { PageHeader, EmptyState, SimBadge } from "@/components/PageHeader";
import { ItemImage } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ClosetIQ" }, { name: "description", content: "Your smart wardrobe at a glance." }, { property: "og:title", content: "Dashboard — ClosetIQ" }, { property: "og:description", content: "Wardrobe overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { data: items = [], isLoading } = useItems();
  const { data: scans = [] } = useScans(5);
  const { data: readings = [] } = useReadings(1);
  const { data: devices = [] } = useDevices();
  const { data: outfits = [] } = useOutfits(1);
  const { data: weather } = useWeatherForProfile();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = profile?.display_name ?? session?.user.email?.split("@")[0];
  const reading = readings[0];
  const online = devices.some((d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_MS);
  const byId = new Map(items.map((i) => [i.id, i]));

  const header = <PageHeader title={`${greet}, ${name}`} subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
    action={<Button asChild size="lg"><Link to="/outfits"><Sparkles className="mr-2 h-4 w-4" />Generate outfit</Link></Button>} />;

  if (!isLoading && items.length === 0)
    return <>{header}<EmptyState icon={<Shirt className="h-6 w-6" />} title="Let's set up your wardrobe" body="Add your first clothing item, or load demo items from Settings." action={<Button asChild><Link to="/add">Add first item</Link></Button>} /></>;

  const stats = [
    ["Total items", items.length],
    ["Available", items.filter((i) => i.availability_status === "available").length],
    ["Categories", new Set(items.map((i) => i.category)).size],
  ] as const;

  return (
    <>
      {header}
      <div className="mb-6 space-y-2">
        {devices.length > 0 && !online && <Warn>Your ESP32 device hasn't reported in the last 5 minutes.</Warn>}
        {reading && Number(reading.humidity) > Number(profile?.humidity_threshold ?? 65) && <Warn>Wardrobe humidity is {Number(reading.humidity)}%{reading.is_simulated ? " (simulated)" : ""} — above your threshold.</Warn>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v]) => <div key={l} className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p><p className="mt-1 font-display text-4xl">{v}</p></div>)}
        <div className="rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><CloudSun className="h-3.5 w-3.5" />Weather</p>
          {weather?.ok ? <><p className="mt-1 font-display text-4xl">{weather.temperatureC}°C</p><p className="text-xs text-muted-foreground">{weather.condition} · {weather.location}</p></>
            : <p className="mt-2 text-sm text-muted-foreground">{weather && !weather.ok ? weather.error : <Link to="/settings" className="underline">Set your city</Link>}</p>}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex justify-between"><h2 className="text-xl">Recently added</h2><Link to="/wardrobe" className="text-sm underline">View all</Link></div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {items.slice(0, 5).map((i) => <Link key={i.id} to="/wardrobe/$id" params={{ id: i.id }}><ItemImage path={i.image_path} alt={i.name} className="aspect-square rounded-xl" /><p className="mt-1 truncate text-xs">{i.name}</p></Link>)}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl">Wardrobe climate</h2>
          {reading ? <><p className="font-display text-3xl">{Number(reading.temperature)}°C · {Number(reading.humidity)}%</p><p className="mt-1 text-xs text-muted-foreground">{new Date(reading.created_at).toLocaleString()}</p>{reading.is_simulated && <SimBadge />}</>
            : <p className="text-sm text-muted-foreground">Waiting for sensor data.</p>}
        </section>
        <section className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl">Latest outfit</h2>
          {outfits[0] ? <div className="flex flex-wrap gap-3">{outfits[0].selected_item_ids.map((id) => byId.get(id)).filter(Boolean).map((i) => <div key={i!.id} className="w-20"><ItemImage path={i!.image_path} alt={i!.name} className="aspect-square rounded-lg" /><p className="mt-1 truncate text-xs">{i!.name}</p></div>)}<p className="w-full text-xs text-muted-foreground">{outfits[0].occasion} · {outfits[0].recommendation_source === "ai" ? "AI" : "Rule-based"}</p></div>
            : <p className="text-sm text-muted-foreground">No saved outfits yet.</p>}
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl">RFID activity</h2>
          {scans.length === 0 ? <p className="text-sm text-muted-foreground">No scans yet.</p> : scans.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1 text-sm"><span className="font-mono">{s.uid}</span><span className="truncate text-muted-foreground">{s.clothing_item_id ? byId.get(s.clothing_item_id)?.name : "Unknown"} · {label(s.event_type)}</span>{s.is_simulated && <SimBadge />}</div>
          ))}
        </section>
      </div>
    </>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-xl bg-warning p-3 text-sm text-warning-foreground"><AlertTriangle className="h-4 w-4" />{children}</div>;
}
