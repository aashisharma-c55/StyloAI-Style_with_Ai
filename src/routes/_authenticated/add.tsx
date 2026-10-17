import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ItemForm } from "@/components/ItemForm";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Add clothing — ClosetIQ" }, { name: "description", content: "Add a garment to your ClosetIQ wardrobe." }, { property: "og:title", content: "Add clothing — ClosetIQ" }, { property: "og:description", content: "Add a garment to your wardrobe." }] }),
  component: () => (
    <>
      <PageHeader title="Add clothing" subtitle="Register a garment manually — RFID tag and photo are optional." />
      <ItemForm />
    </>
  ),
});
