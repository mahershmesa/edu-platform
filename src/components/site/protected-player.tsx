"use client";

/**
 * YouTube player wrapped so the video id is not exposed as a link: overlays block the
 * YouTube title bar and logo, right-click is disabled, and a drifting watermark shows the viewer.
 */
export function ProtectedPlayer({ videoId, watermark }: { videoId: string; watermark?: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=0`;
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={src}
        title="مشغّل الدرس"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Block the title / channel link and "watch on YouTube" logo. */}
      <div className="absolute inset-x-0 top-0 h-[16%]" aria-hidden />
      <div className="absolute bottom-0 left-0 h-[18%] w-[22%]" aria-hidden />
      {watermark && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="watermark absolute top-[10%] left-[60%] rounded-md bg-black/10 px-2 py-1 text-xs font-semibold whitespace-nowrap text-white/35 sm:text-sm">
            {watermark}
          </div>
        </div>
      )}
    </div>
  );
}
