import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ClosetIQ" },
      { name: "description", content: "Sign in or create your ClosetIQ smart wardrobe account." },
      { property: "og:title", content: "Sign in — ClosetIQ" },
      { property: "og:description", content: "Access your ClosetIQ smart wardrobe." },
    ],
  }),
  component: Login,
});

const Creds = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(8, "Password must be at least 8 characters") });

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (session) nav({ to: "/dashboard" }); }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = Creds.safeParse({ email, password });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { error, data } = mode === "signin"
      ? await supabase.auth.signInWithPassword(p.data)
      : await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "signup" && !data.session) toast.success("Check your email to confirm your account.");
  }

  async function oauth(provider: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/login" });
    if (r.error) toast.error(r.error.message ?? "Sign-in failed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <Link to="/" className="font-display text-2xl">ClosetIQ</Link>
        <h1 className="mt-6 text-2xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}</Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continue with Google</Button>
          <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to ClosetIQ?" : "Already have an account?"}{" "}
          <button className="font-semibold text-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
