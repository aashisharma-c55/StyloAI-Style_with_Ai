import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudRain, CloudSun, Droplets, RefreshCw, Save, Sparkles, Check, AlertTriangle, Shirt, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/lib/auth";
import { useItems, useProfile, useWeatherForProfile } from "@/lib/data";
import { generateOutfit, type OutfitResponse } from "@/lib/outfit.functions";
import { getWeather, type WeatherResult } from "@/lib/weather.functions";
import { COLORS, label } from "@/lib/constants";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ItemImage } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/outfits")({
  head: () => ({ meta: [{ title: "Outfit recommendations — ClosetIQ" }, { name: "description", content: "AI and rule-based outfit suggestions from your own wardrobe." }, { property: "og:title", content: "Outfit recommendations — ClosetIQ" }, { property: "og:description", content: "Get outfit suggestions." }] }),
  component: Outfits,
});

const OCC = ["College", "Casual", "Formal", "Party", "Wedding", "Travel", "Custom"];

function Outfits() {
  const uid = useUserId();
  const qc = useQueryClient();
  const { data: items = [] } = useItems();
  const { data: profile } = useProfile();
  const { data: liveWeather } = useWeatherForProfile();
  const gen = useServerFn(generateOutfit);
  const fetchWeather = useServerFn(getWeather);

  const [occasion, setOccasion] = useState("College");
  const [custom, setCustom] = useState("");
  const [temp, setTemp] = useState<string>("");
  const [cond, setCond] = useState("");
  const [rain, setRain] = useState(false);
  const [city, setCity] = useState("");
  const [weatherSrc, setWeatherSrc] = useState<string>("Manual");
  const [weatherDetails, setWeatherDetails] = useState<Extract<WeatherResult, { ok: true }> | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [style, setStyle] = useState("");
  const [comfort, setComfort] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [variation, setVariation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wBusy, setWBusy] = useState(false);
  const [result, setResult] = useState<OutfitResponse | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (liveWeather?.ok && temp === "") {
      setTemp(String(liveWeather.temperatureC)); setCond(liveWeather.condition); setRain(liveWeather.isRaining);
      setWeatherSrc(`${liveWeather.source} · ${liveWeather.location} · ${new Date(liveWeather.fetchedAt).toLocaleTimeString()}`);
      setWeatherDetails(liveWeather);
    } else if (liveWeather && !liveWeather.ok) {
      setWeatherError(liveWeather.error);
    }
  }, [liveWeather]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (profile?.location_name && !city) setCity(profile.location_name); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadWeather() {
    if (!city.trim()) return toast.error("Enter a city");
    setWBusy(true);
    const w = await fetchWeather({ data: { location: city } }).catch(() => null);
    setWBusy(false);
    if (!w || !w.ok) {
      const message = w && !w.ok ? w.error : "Couldn't reach the weather service. Please retry or enter weather manually.";
      setWeatherError(message);
      return toast.error(message);
    }
    setWeatherError(null);
    setWeatherDetails(w);
    setTemp(String(w.temperatureC)); setCond(w.condition); setRain(w.isRaining);
    setWeatherSrc(`${w.source} · ${w.location} · ${new Date(w.fetchedAt).toLocaleTimeString()}`);
  }

  async function run(v: number) {
    const occ = occasion === "Custom" ? custom.trim() : occasion;
    if (!occ) return toast.error("Describe your custom occasion");
    const t = temp === "" ? null : Number(temp);
    if (t != null && (Number.isNaN(t) || t < -50 || t > 60)) return toast.error("Temperature must be between -50 and 60 °C");
    setBusy(true); setSaved(null);
    try {
      const r = await gen({ data: { occasion: occ, temperatureC: t, condition: cond || null, isRaining: rain, preferredColors: colors, style: style || undefined, comfort: comfort || undefined, variation: v, useAi } });
      setResult(r); setVariation(v);
      if (r.notice) toast.message(r.notice);
    } catch {
      toast.error("Couldn't generate an outfit. Please try again.");
    } finally { setBusy(false); }
  }

  async function save(markWorn = false) {
    if (!result) return;
    const occ = occasion === "Custom" ? custom : occasion;
    const weather_summary = temp ? `${temp}°C${cond ? `, ${cond}` : ""}${rain ? ", rain" : ""}` : null;
    if (saved) {
      if (markWorn) {
        await supabase.from("outfit_recommendations").update({ worn_at: new Date().toISOString() }).eq("id", saved);
        toast.success("Marked as worn");
      }
      return;
    }
    const { data, error } = await supabase.from("outfit_recommendations").insert({
      user_id: uid, occasion: occ, weather_summary, selected_item_ids: result.itemIds,
      explanation: result.explanation, styling_tips: result.stylingTips || null, recommendation_source: result.source,
      worn_at: markWorn ? new Date().toISOString() : null,
    }).select("id").single();
    if (error) return toast.error("Couldn't save outfit");
    setSaved(data.id);
    qc.invalidateQueries({ queryKey: ["outfits"] });
    toast.success(markWorn ? "Saved and marked as worn" : "Outfit saved to history");
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const chosen = result?.itemIds.map((id) => byId.get(id)).filter(Boolean) ?? [];

  if (items.length === 0)
    return (<><PageHeader title="Outfit recommendations" /><EmptyState icon={<Shirt className="h-6 w-6" />} title="Add clothes first" body="Recommendations only use clothing you've registered." action={<Button asChild><Link to="/add">Add clothing</Link></Button>} /></>);

  return (
    <>
      <PageHeader title="Outfit recommendations" subtitle="Built only from your available, clean clothing." />
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label>Occasion</Label>
            <div className="flex flex-wrap gap-2">
              {OCC.map((o) => (
                <button key={o} onClick={() => setOccasion(o)} aria-pressed={occasion === o}
                  className={cn("rounded-full border px-3 py-1 text-sm", occasion === o ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary")}>{o}</button>
              ))}
            </div>
            {occasion === "Custom" && <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Job interview" maxLength={50} />}
          </div>
          <div className="space-y-3 rounded-xl bg-secondary/60 p-4">
            <Label className="flex items-center gap-2"><CloudSun className="h-4 w-4" />Weather & outfit suggestions</Label>
            <div className="flex gap-2">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              <Button variant="outline" onClick={loadWeather} disabled={wBusy} aria-label={weatherDetails ? "Refresh weather" : "Fetch weather"}>{wBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><RefreshCw className="mr-1 h-4 w-4" />{weatherDetails ? "Refresh" : "Fetch"}</>}</Button>
            </div>
            {wBusy && <p className="text-sm text-muted-foreground">Updating local weather…</p>}
            {weatherError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{weatherError}</p><Button size="sm" variant="outline" onClick={loadWeather} disabled={wBusy}>Try again</Button></div>}
            {weatherDetails && weatherSrc !== "Manual" && (
              <div className="space-y-3 border-y py-3">
                <div className="flex items-center gap-3">
                  <img src={weatherDetails.icon} alt="" className="h-12 w-12" />
                  <div><p className="font-display text-3xl">{weatherDetails.temperatureC}°C</p><p className="text-sm text-muted-foreground">{weatherDetails.condition} · {weatherDetails.location}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <p className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{weatherDetails.humidity}% humidity</p>
                  <p className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{weatherDetails.windKph} km/h</p>
                  <p className="flex items-center gap-1"><CloudRain className="h-3.5 w-3.5" />{weatherDetails.rainChance}% rain</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={temp} onChange={(e) => { setTemp(e.target.value); setWeatherSrc("Manual"); setWeatherDetails(null); setWeatherError(null); }} placeholder="°C" aria-label="Temperature °C" />
              <Input value={cond} onChange={(e) => { setCond(e.target.value); setWeatherSrc("Manual"); setWeatherDetails(null); setWeatherError(null); }} placeholder="Condition" aria-label="Condition" />
            </div>
            <label className="flex items-center justify-between text-sm">Raining<Switch checked={rain} onCheckedChange={(v) => { setRain(v); setWeatherSrc("Manual"); setWeatherDetails(null); setWeatherError(null); }} /></label>
            <p className="text-xs text-muted-foreground">Source: {weatherSrc}</p>
          </div>
          <div className="space-y-2">
            <Label>Preferred colours</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.slice(0, 12).map((c) => {
                const on = colors.includes(c);
                return <button key={c} onClick={() => setColors(on ? colors.filter((x) => x !== c) : [...colors, c])} aria-pressed={on}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-sage bg-accent text-accent-foreground" : "hover:bg-secondary")}>{label(c)}</button>;
              })}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Style</Label>
            <Select value={style || "any"} onValueChange={(v) => setStyle(v === "any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["any", "minimal", "smart casual", "streetwear", "classic", "bold", "traditional"].map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Comfort notes</Label><Input value={comfort} onChange={(e) => setComfort(e.target.value)} placeholder="e.g. lots of walking" maxLength={200} /></div>
          <label className="flex items-center justify-between text-sm">Use AI stylist<Switch checked={useAi} onCheckedChange={setUseAi} /></label>
          <Button className="w-full" size="lg" onClick={() => run(0)} disabled={busy}><Sparkles className="mr-2 h-4 w-4" />{busy ? "Styling…" : "Generate outfit"}</Button>
        </div>

        <div>
          {!result ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Ready when you are" body="Set the occasion and weather, then generate an outfit from your wardrobe." />
          ) : (
            <div className="rounded-2xl border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", result.source === "ai" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")}>
                  {result.source === "ai" ? "AI-generated recommendation" : "Rule-based recommendation"}
                </span>
                <span className="text-sm text-muted-foreground">{occasion === "Custom" ? custom : occasion} · {result.weatherSuitability}</span>
              </div>
              {chosen.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {chosen.map((i) => (
                    <div key={i!.id} className="overflow-hidden rounded-xl border">
                      <ItemImage path={i!.image_path} alt={i!.name} className="aspect-square" />
                      <div className="p-3"><p className="font-semibold">{i!.name}</p><p className="text-xs text-muted-foreground">{label(i!.category)} · {label(i!.color)}</p></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">No complete outfit could be built.</p>}
              {result.missing.length > 0 && (
                <div className="mt-4 flex gap-2 rounded-xl bg-warning p-3 text-sm text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>Your wardrobe is missing {result.missing.join(", ")} for a complete look.</span>
                </div>
              )}
              <div className="mt-5 space-y-2 text-sm">
                <p><span className="font-semibold">Why this works: </span>{result.explanation}</p>
                {result.stylingTips && <p><span className="font-semibold">Styling tips: </span>{result.stylingTips}</p>}
              </div>
              {result.alternatives.length > 0 && (
                <div className="mt-4 text-sm"><p className="font-semibold">Alternatives</p>
                  {result.alternatives.map((a, k) => <p key={k} className="text-muted-foreground">• {a.map((id) => byId.get(id)?.name).filter(Boolean).join(" + ")}</p>)}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => save(false)} disabled={!!saved || chosen.length === 0}>{saved ? <><Check className="mr-1 h-4 w-4" />Saved</> : <><Save className="mr-1 h-4 w-4" />Save outfit</>}</Button>
                <Button variant="outline" onClick={() => run(variation + 1)} disabled={busy}><RefreshCw className="mr-1 h-4 w-4" />Try another</Button>
                <Button variant="ghost" onClick={() => save(true)} disabled={chosen.length === 0}>Mark as worn</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
