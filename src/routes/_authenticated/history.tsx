import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useItems, useOutfits } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ItemImage } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Outfit history — ClosetIQ" }, { name: "description", content: "Your saved and worn outfits." }, { property: "og:title", content: "Outfit history — ClosetIQ" }, { property: "og:description", content: "Saved outfits." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: outfits = [], isLoading } = useOutfits();
  const { data: items = [] } = useItems();
  const qc = useQueryClient();
  const byId = new Map(items.map((i) => [i.id, i]));

  async function remove(id: string) {
    const { error } = await supabase.from("outfit_recommendations").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete");
    qc.invalidateQueries({ queryKey: ["outfits"] });
  }
  async function worn(id: string) {
    await supabase.from("outfit_recommendations").update({ worn_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["outfits"] });
  }

  return (
    <>
      <PageHeader title="Outfit history" subtitle="Outfits you've saved." />
      {!isLoading && outfits.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="No saved outfits yet" body="Generate a recommendation and press Save outfit." action={<Button asChild><Link to="/outfits">Get a recommendation</Link></Button>} />
      ) : (
        <div className="space-y-4">
          {outfits.map((o) => {
            const its = o.selected_item_ids.map((id) => byId.get(id));
            return (
              <div key={o.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.occasion} <span className="ml-2 text-xs font-normal text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span></p>
                    <p className="text-xs text-muted-foreground">{o.recommendation_source === "ai" ? "AI-generated" : "Rule-based"}{o.weather_summary ? ` · ${o.weather_summary}` : ""}{o.worn_at ? ` · Worn ${new Date(o.worn_at).toLocaleDateString()}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    {!o.worn_at && <Button size="sm" variant="outline" onClick={() => worn(o.id)}>Mark as worn</Button>}
                    <Button size="sm" variant="ghost" aria-label="Delete outfit" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {its.map((i, k) => i ? (
                    <div key={i.id} className="w-24"><ItemImage path={i.image_path} alt={i.name} className="aspect-square rounded-lg" /><p className="mt-1 truncate text-xs">{i.name}</p></div>
                  ) : <div key={k} className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-center text-xs text-muted-foreground">Item removed</div>)}
                </div>
                {o.explanation && <p className="mt-3 text-sm text-muted-foreground">{o.explanation}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
