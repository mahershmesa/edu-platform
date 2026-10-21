"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerSlide = { id: string; imageUrl: string; title: string | null; description: string | null; link: string | null };

export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-brand-700 shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        // RTL: swiping left goes to the next slide.
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      aria-roledescription="carousel"
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(${index * 100}%)` }}>
        {slides.map((s, i) => {
          const body = (
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/8]">
              <img src={s.imageUrl} alt={s.title ?? "إعلان"} className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
              {(s.title || s.description) && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/15 to-transparent p-5 sm:p-10">
                  <div className="max-w-xl text-white">
                    {s.title && <p className="text-xl font-extrabold leading-snug sm:text-4xl">{s.title}</p>}
                    {s.description && <p className="mt-2 text-sm text-white/90 sm:text-lg">{s.description}</p>}
                  </div>
                </div>
              )}
            </div>
          );
          return (
            <div key={s.id} className="w-full shrink-0" aria-hidden={i !== index}>
              {s.link ? (
                s.link.startsWith("/") ? (
                  <Link href={s.link} tabIndex={i === index ? 0 : -1}>{body}</Link>
                ) : (
                  <a href={s.link} target="_blank" rel="noopener noreferrer" tabIndex={i === index ? 0 : -1}>{body}</a>
                )
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow hover:bg-white sm:grid"
            aria-label="السابق"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(index + 1)}
            className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow hover:bg-white sm:grid"
            aria-label="التالي"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-2 bg-white/55")}
                aria-label={`الشريحة ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
