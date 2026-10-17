import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/lib/auth";
import type { Item } from "@/lib/data";
import { useImageUrl } from "@/lib/data";
import { CATEGORIES, COLORS, SEASONS, OCCASIONS, AVAILABILITY, LAUNDRY, label } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.enum(CATEGORIES, { message: "Choose a category" }),
  color: z.string().min(1, "Choose a colour"),
  season: z.string().min(1),
  occasions: z.array(z.string()).min(1, "Pick at least one occasion"),
  brand: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
  rfid: z.string().trim().toUpperCase().regex(/^([0-9A-F]{4,20})?$/, "RFID UID must be 4–20 hex characters").optional(),
});

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ItemForm({ item, rfidUid }: { item?: Item; rfidUid?: string }) {
  const uid = useUserId();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: item?.name ?? "", category: item?.category ?? "", color: item?.color ?? "", season: item?.season ?? "all",
    occasions: item?.occasions ?? [], brand: item?.brand ?? "", notes: item?.notes ?? "", rfid: rfidUid ?? "",
    availability_status: item?.availability_status ?? "available", laundry_status: item?.laundry_status ?? "clean",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: existingUrl } = useImageUrl(removeImage ? null : item?.image_path);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files?.[0];
    if (!fl) return undefined;
    if (!TYPES.includes(fl.type)) return toast.error("Use a JPG, PNG or WebP image.");
    if (fl.size > MAX) return toast.error("Image must be under 5 MB.");
    setFile(fl);
    setPreview(URL.createObjectURL(fl));
    setRemoveImage(false);
    return undefined;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = Schema.safeParse(f);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return toast.error("Please fix the highlighted fields.");
    }
    setErrors({});
    const d = p.data;
    setProgress(10);
    try {
      if (d.rfid) {
        const { data: clash } = await supabase.from("rfid_tags").select("clothing_item_id").eq("uid", d.rfid).maybeSingle();
        if (clash && clash.clothing_item_id !== item?.id) {
          setProgress(null);
          setErrors({ rfid: "This RFID tag is already assigned to another item." });
          return toast.error("RFID UID already in use.");
        }
      }
      let image_path = removeImage ? null : item?.image_path ?? null;
      if (file) {
        setProgress(35);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("clothing-images").upload(path, file, { contentType: file.type });
        if (error) throw new Error("Image upload failed: " + error.message);
        if (item?.image_path) await supabase.storage.from("clothing-images").remove([item.image_path]);
        image_path = path;
      } else if (removeImage && item?.image_path) {
        await supabase.storage.from("clothing-images").remove([item.image_path]);
      }
      setProgress(70);
      const row = {
        name: d.name, category: d.category, color: d.color, season: d.season, occasions: d.occasions,
        brand: d.brand || null, notes: d.notes || null, image_path,
        availability_status: f.availability_status, laundry_status: f.laundry_status,
      };
      let id = item?.id;
      if (item) {
        const { error } = await supabase.from("clothing_items").update(row).eq("id", item.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("clothing_items").insert({ ...row, user_id: uid }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      // RFID mapping
      if (d.rfid && d.rfid !== rfidUid) {
        await supabase.from("rfid_tags").delete().eq("clothing_item_id", id!);
        const { error } = await supabase.from("rfid_tags").insert({ user_id: uid, clothing_item_id: id!, uid: d.rfid });
        if (error) throw new Error(error.code === "23505" ? "RFID UID already in use." : error.message);
      } else if (!d.rfid && rfidUid) {
        await supabase.from("rfid_tags").delete().eq("clothing_item_id", id!);
      }
      setProgress(100);
      await Promise.all([qc.invalidateQueries({ queryKey: ["items"] }), qc.invalidateQueries({ queryKey: ["tags"] })]);
      toast.success(item ? "Item updated" : "Item added to your wardrobe");
      nav({ to: "/wardrobe" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save item");
    } finally {
      setProgress(null);
    }
    return undefined;
  }

  const img = preview ?? existingUrl;
  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div>
        <Label>Photo (optional)</Label>
        <label className="mt-2 flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card text-sm text-muted-foreground hover:bg-secondary">
          {img ? <img src={img} alt="Preview" className="h-full w-full object-cover" /> : (<><Upload className="mb-2 h-6 w-6" />Upload JPG, PNG, WebP · 5 MB</>)}
          <input type="file" accept={TYPES.join(",")} className="sr-only" onChange={onFile} />
        </label>
        {img && (
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { setFile(null); setPreview(null); setRemoveImage(true); }}>
            <X className="mr-1 h-4 w-4" /> Remove photo
          </Button>
        )}
      </div>
      <div className="space-y-5 rounded-2xl border bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="name">Clothing name *</Label><Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Linen button-down" />{err("name")}</div>
          <Field label="Category *" value={f.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
          <Field label="Primary colour *" value={f.color} onChange={(v) => set("color", v)} options={COLORS} />
          <Field label="Season" value={f.season} onChange={(v) => set("season", v)} options={SEASONS} />
          <div className="space-y-1.5"><Label htmlFor="brand">Brand</Label><Input id="brand" value={f.brand} onChange={(e) => set("brand", e.target.value)} /></div>
          {item && <Field label="Availability" value={f.availability_status} onChange={(v) => set("availability_status", v)} options={AVAILABILITY} />}
          {item && <Field label="Laundry" value={f.laundry_status} onChange={(v) => set("laundry_status", v)} options={LAUNDRY} />}
        </div>
        {(errors["category"] || errors["color"]) && <p className="text-xs text-destructive">{errors["category"] ?? errors["color"]}</p>}
        <div className="space-y-2">
          <Label>Suitable occasions *</Label>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => {
              const on = f.occasions.includes(o);
              return (
                <button type="button" key={o} aria-pressed={on}
                  onClick={() => set("occasions", on ? f.occasions.filter((x) => x !== o) : [...f.occasions, o])}
                  className={cn("rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}>
                  {label(o)}
                </button>
              );
            })}
          </div>
          {err("occasions")}
        </div>
        <div className="space-y-1.5"><Label htmlFor="rfid">RFID UID (optional)</Label><Input id="rfid" value={f.rfid} onChange={(e) => set("rfid", e.target.value.toUpperCase())} placeholder="A1B2C3D4" className="font-mono" />{err("rfid")}</div>
        <div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} /></div>
        {progress != null && <Progress value={progress} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => nav({ to: "/wardrobe" })}>Cancel</Button>
          <Button disabled={progress != null}>{progress != null ? "Saving…" : item ? "Save changes" : "Add to wardrobe"}</Button>
        </div>
      </div>
    </form>
  );
}

function Field({ label: l, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <Label>{l}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{label(o)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
