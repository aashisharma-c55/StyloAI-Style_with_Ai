import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ItemForm } from "@/components/ItemForm";
import { useItems, useTags } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/wardrobe/$id")({
  head: () => ({ meta: [{ title: "Edit item — ClosetIQ" }, { name: "description", content: "View and edit a clothing item." }, { property: "og:title", content: "Edit item — ClosetIQ" }, { property: "og:description", content: "Edit clothing details." }] }),
  component: EditItem,
});

function EditItem() {
  const { id } = Route.useParams();
  const { data: items, isLoading } = useItems();
  const { data: tags, isLoading: tl } = useTags();
  if (isLoading || tl) return <p className="text-muted-foreground">Loading…</p>;
  const item = items?.find((i) => i.id === id);
  if (!item) return <p>Item not found. <Link to="/wardrobe" className="underline">Back to wardrobe</Link></p>;
  const tag = tags?.find((t) => t.clothing_item_id === id);
  return (
    <>
      <Link to="/wardrobe" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Wardrobe</Link>
      <PageHeader title={item.name} subtitle={`Added ${new Date(item.created_at).toLocaleDateString()}${item.is_sample ? " · Sample item" : ""}`} />
      <ItemForm key={item.id} item={item} rfidUid={tag?.uid} />
    </>
  );
}
