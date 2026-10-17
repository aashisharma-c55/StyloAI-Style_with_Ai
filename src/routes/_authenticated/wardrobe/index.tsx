import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Grid2x2, List, Plus, Radio, Search, Shirt, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useItems, useTags, type Item } from "@/lib/data";
import { CATEGORIES, COLORS, OCCASIONS, AVAILABILITY, label } from "@/lib/constants";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ItemImage } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/wardrobe/")({
  head: () => ({ meta: [{ title: "My wardrobe — ClosetIQ" }, { name: "description", content: "Browse, search and filter your clothing inventory." }, { property: "og:title", content: "My wardrobe — ClosetIQ" }, { property: "og:description", content: "Your clothing inventory." }] }),
  component: Wardrobe,
});

function Filter({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{label(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Wardrobe() {
  const { data: items = [], isLoading, error } = useItems();
  const { data: tags = [] } = useTags();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [color, setColor] = useState("all");
  const [occ, setOcc] = useState("all");
  const [avail, setAvail] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [del, setDel] = useState<Item | null>(null);
  const tagged = new Map(tags.map((t) => [t.clothing_item_id, t.uid]));

  const filtered = useMemo(() => items.filter((i) =>
    (cat === "all" || i.category === cat) && (color === "all" || i.color === color) &&
    (occ === "all" || i.occasions.includes(occ)) && (avail === "all" || i.availability_status === avail) &&
    (!q || `${i.name} ${i.brand ?? ""} ${i.color} ${i.category}`.toLowerCase().includes(q.toLowerCase())),
  ), [items, cat, color, occ, avail, q]);

  async function confirmDelete() {
    if (!del) return;
    const { error } = await supabase.from("clothing_items").delete().eq("id", del.id);
    if (error) return toast.error("Could not delete item");
    if (del.image_path) await supabase.storage.from("clothing-images").remove([del.image_path]);
    toast.success("Item deleted");
    setDel(null);
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
  }

  return (
    <>
      <PageHeader title="My wardrobe" subtitle={`${items.length} items`} action={<Button asChild><Link to="/add"><Plus className="mr-1 h-4 w-4" />Add clothing</Link></Button>} />
      {error && <p className="text-destructive">Couldn't load your wardrobe.</p>}
      {!isLoading && items.length === 0 ? (
        <EmptyState icon={<Shirt className="h-6 w-6" />} title="Your wardrobe is empty" body="Add your first garment, or load sample items from Settings to try the demo."
          action={<Button asChild><Link to="/add">Add first item</Link></Button>} />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 sm:min-w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, brand, colour…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Filter value={cat} onChange={setCat} all="All categories" options={CATEGORIES} />
            <Filter value={color} onChange={setColor} all="All colours" options={COLORS} />
            <Filter value={occ} onChange={setOcc} all="All occasions" options={OCCASIONS} />
            <Filter value={avail} onChange={setAvail} all="Any status" options={AVAILABILITY} />
            <div className="flex rounded-md border">
              <button aria-label="Grid view" onClick={() => setView("grid")} className={`px-3 ${view === "grid" ? "bg-secondary" : ""}`}><Grid2x2 className="h-4 w-4" /></button>
              <button aria-label="List view" onClick={() => setView("list")} className={`px-3 ${view === "list" ? "bg-secondary" : ""}`}><List className="h-4 w-4" /></button>
            </div>
          </div>
          {filtered.length === 0 && !isLoading && <p className="py-10 text-center text-muted-foreground">No items match these filters.</p>}
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((i) => (
                <div key={i.id} className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
                  <Link to="/wardrobe/$id" params={{ id: i.id }}><ItemImage path={i.image_path} alt={i.name} className="aspect-[3/4]" /></Link>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link to="/wardrobe/$id" params={{ id: i.id }} className="font-semibold leading-tight hover:underline">{i.name}</Link>
                      <button aria-label={`Delete ${i.name}`} onClick={() => setDel(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{label(i.category)} · {label(i.color)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <StatusBadge s={i.availability_status} />
                      {i.laundry_status !== "clean" && <Badge variant="outline">{label(i.laundry_status)}</Badge>}
                      {tagged.has(i.id) && <Badge variant="outline" className="gap-1"><Radio className="h-3 w-3" />RFID</Badge>}
                      {i.is_sample && <Badge variant="outline">Sample</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y rounded-2xl border bg-card">
              {filtered.map((i) => (
                <div key={i.id} className="flex items-center gap-4 p-3">
                  <ItemImage path={i.image_path} alt={i.name} className="h-14 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to="/wardrobe/$id" params={{ id: i.id }} className="font-semibold hover:underline">{i.name}</Link>
                    <p className="text-xs text-muted-foreground">{label(i.category)} · {label(i.color)} · {i.occasions.map(label).join(", ")}{tagged.get(i.id) ? ` · ${tagged.get(i.id)}` : ""}</p>
                  </div>
                  <StatusBadge s={i.availability_status} />
                  <button aria-label={`Delete ${i.name}`} onClick={() => setDel(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{del?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the item, its photo and RFID mapping. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StatusBadge({ s }: { s: string }) {
  const cls = s === "available" ? "bg-accent text-accent-foreground" : s === "in_use" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label(s)}</span>;
}
