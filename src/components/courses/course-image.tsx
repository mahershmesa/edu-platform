/* eslint-disable @next/next/no-img-element */
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/** Course cover with a placeholder when no image is set. */
export function CourseImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src)
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600", className)}>
        <BookOpen className="h-1/3 max-h-10 w-1/3 max-w-10" />
      </div>
    );
  return <img src={src} alt={alt} className={cn("object-cover", className)} loading="lazy" />;
}
