import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, CloudSun, Sparkles, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import hero from "@/assets/hero-wardrobe.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClosetIQ — AI-Powered Smart Wardrobe" },
      { name: "description", content: "Track clothing with RFID, monitor wardrobe humidity, and get AI outfit picks from what you actually own." },
      { property: "og:title", content: "ClosetIQ — AI-Powered Smart Wardrobe" },
      { property: "og:description", content: "RFID inventory, wardrobe sensors and AI outfit recommendations." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session } = useAuth();
  const features = [
    { icon: Cpu, t: "RFID inventory", d: "ESP32 + RC522 reader logs every garment in and out." },
    { icon: Sparkles, t: "AI outfits", d: "Picks only from clothes you own and have available." },
    { icon: CloudSun, t: "Live weather", d: "Recommendations adapt to temperature and rain." },
    { icon: Thermometer, t: "Wardrobe climate", d: "Humidity alerts protect fabrics from damp." },
  ];
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl">ClosetIQ</span>
        <Button asChild variant={session ? "default" : "outline"}>
          <Link to={session ? "/dashboard" : "/login"}>{session ? "Open dashboard" : "Sign in"}</Link>
        </Button>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sage">Smart wardrobe</p>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl">Your closet, <em className="text-sage">thinking</em> with you.</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            ClosetIQ connects an RFID-tagged wardrobe to intelligent outfit recommendations — grounded in the clothes you really own.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to={session ? "/dashboard" : "/login"}>Get started</Link></Button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.t} className="flex gap-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                <div><p className="font-semibold">{f.t}</p><p className="text-sm text-muted-foreground">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <img src={hero} alt="An organised wardrobe in neutral tones" className="aspect-square w-full rounded-3xl object-cover shadow-sm" />
      </main>
    </div>
  );
}
