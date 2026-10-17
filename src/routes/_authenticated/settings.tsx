import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/lib/auth";
import { useProfile } from "@/lib/data";
import { getWeather } from "@/lib/weather.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ClosetIQ" }, { name: "description", content: "Profile, weather location and demo data." }, { property: "og:title", content: "Settings — ClosetIQ" }, { property: "og:description", content: "ClosetIQ settings." }] }),
  component: SettingsPage,
});

const SAMPLES = [
  { name: "White Oxford Shirt", category: "shirts", color: "white", season: "all", occasions: ["college", "formal"] },
  { name: "Grey Crew T-shirt", category: "t-shirts", color: "grey", season: "summer", occasions: ["casual", "college", "travel"] },
  { name: "Navy Chinos", category: "trousers", color: "navy", season: "all", occasions: ["college", "formal"] },
  { name: "Blue Slim Jeans", category: "jeans", color: "blue", season: "all", occasions: ["casual", "college", "travel"] },
  { name: "Olive Bomber Jacket", category: "jackets", color: "olive", season: "winter", occasions: ["casual", "college"] },
  { name: "White Sneakers", category: "footwear", color: "white", season: "all", occasions: ["casual", "college", "travel"] },
  { name: "Maroon Kurta", category: "ethnic wear", color: "maroon", season: "all", occasions: ["wedding", "party"] },
  { name: "Brown Leather Belt", category: "accessories", color: "brown", season: "all", occasions: ["formal", "party"] },
];

function SettingsPage() {
  const uid = useUserId();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const fetchWeather = useServerFn(getWeather);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) { setName(profile.display_name ?? ""); setCity(profile.location_name ?? ""); } }, [profile]);

  async function save() {
    setBusy(true);
    const upd: { display_name: string; location_name?: string | null; latitude?: number | null; longitude?: number | null } = { display_name: name.trim().slice(0, 60) };
    if (city.trim() && city !== profile?.location_name) {
      const w = await fetchWeather({ data: { location: city } }).catch(() => null);
      if (!w || !w.ok) { setBusy(false); return toast.error(w && !w.ok ? w.error : "Couldn't verify city"); }
      Object.assign(upd, { location_name: w.location, latitude: w.latitude, longitude: w.longitude });
    } else if (!city.trim()) Object.assign(upd, { location_name: null, latitude: null, longitude: null });
    const { error } = await supabase.from("profiles").update(upd).eq("id", uid);
    setBusy(false);
    if (error) return toast.error("Couldn't save");
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function loadSamples() {
    const { error } = await supabase.from("clothing_items").insert(SAMPLES.map((s) => ({ ...s, user_id: uid, is_sample: true })));
    if (error) return toast.error("Couldn't add samples");
    toast.success("Sample items added");
    qc.invalidateQueries({ queryKey: ["items"] });
  }
  async function removeSamples() {
    await supabase.from("clothing_items").delete().eq("is_sample", true);
    toast.success("Sample items removed");
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl">Profile & weather</h2>
          <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>City for live weather</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" /><p className="mt-1 text-xs text-muted-foreground">Weather by Open-Meteo. You can always enter weather manually on the outfit page.</p></div>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </section>
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl">Demo data</h2>
          <p className="text-sm text-muted-foreground">Add labelled sample garments for a demonstration. They're marked "Sample" and can be removed at any time.</p>
          <div className="flex gap-2"><Button variant="outline" onClick={loadSamples}>Load sample items</Button><Button variant="ghost" onClick={removeSamples}>Remove samples</Button></div>
        </section>
      </div>
    </>
  );
}
