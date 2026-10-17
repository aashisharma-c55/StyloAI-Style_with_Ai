import { Shirt } from "lucide-react";
import { useImageUrl } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ItemImage({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const { data: url } = useImageUrl(path);
  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-secondary", className)}>
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Shirt className="h-1/3 w-1/3 text-muted-foreground/50" aria-hidden />
      )}
    </div>
  );
}
