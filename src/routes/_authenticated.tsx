import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Shirt, PlusCircle, Sparkles, Radio, Thermometer, History, Settings, LogOut, Menu, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wardrobe", label: "My Wardrobe", icon: Shirt },
  { to: "/add", label: "Add Clothing", icon: PlusCircle },
  { to: "/outfits", label: "Outfit Recommendations", icon: Sparkles },
  { to: "/rfid", label: "RFID Scanner", icon: Radio },
  { to: "/environment", label: "Wardrobe Environment", icon: Thermometer },
  { to: "/history", label: "Outfit History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Layout() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();
  useEffect(() => { if (!loading && !session) nav({ to: "/login" }); }, [loading, session, nav]);
  if (loading || !session) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link to="/dashboard" className="mb-6 px-3 font-display text-2xl" onClick={() => setOpen(false)}>ClosetIQ</Link>
      {NAV.map((n) => (
        <Link
          key={n.to} to={n.to} onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          activeProps={{ className: "!bg-sidebar-primary !text-sidebar-primary-foreground" }}
        >
          <n.icon className="h-4 w-4" /> {n.label}
        </Link>
      ))}
      <div className="mt-auto border-t pt-4">
        <div className="px-3 text-sm">
          <p className="font-semibold">{profile?.display_name ?? "You"}</p>
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar lg:block">{sidebar}</aside>
      <div className="flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
        <span className="font-display text-xl">ClosetIQ</span>
        <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            <button aria-label="Close menu" className="absolute right-3 top-4" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 lg:py-12")}>
        <Outlet />
      </main>
    </div>
  );
}
