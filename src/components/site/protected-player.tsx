"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gauge, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Protected lesson player.
 *
 * YouTube's own interface (title, channel link, share, "watch on YouTube", logo, suggested
 * videos, right-click menu) is never shown or reachable:
 *  - the embed runs with controls=0 and is covered by a transparent layer that receives
 *    every click/tap, so nothing inside the YouTube frame can be pressed on any device;
 *  - our own controls drive the video through the YouTube IFrame API;
 *  - before playing, while paused and after the end, an opaque screen covers the frame,
 *    hiding YouTube's pause/end overlays and suggestions;
 *  - full screen applies to our container (overlay + watermark stay on top); on iPhone,
 *    where web pages cannot go full screen, the player fills the viewport instead.
 * A drifting watermark with the student's name and phone deters screen recording.
 */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(r: number): void;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("youtube api failed"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** The id arrives lightly encoded so it is not a plain searchable string in the page. */
function decodeId(token: string): string {
  try {
    return atob(token).split("").reverse().join("");
  } catch {
    return "";
  }
}

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function ProtectedPlayer({ token, watermark, title }: { token: string; watermark?: string; title?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [state, setState] = useState<number>(-1);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showRates, setShowRates] = useState(false);
  const [full, setFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seeking, setSeeking] = useState<number | null>(null);

  // Create the YouTube player once.
  useEffect(() => {
    const videoId = decodeId(token);
    if (!videoId || !mountRef.current) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    const target = document.createElement("div");
    mountRef.current.appendChild(target);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(playerRef.current?.getDuration() ?? 0);
          },
          onStateChange: (e) => {
            setState(e.data);
            if (e.data === STATE.PLAYING) setStarted(true);
            setDuration(playerRef.current?.getDuration() ?? 0);
          },
          onError: () => setFailed(true),
        },
      });
    }).catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, [token]);

  // Poll the current time while playing.
  useEffect(() => {
    if (state !== STATE.PLAYING) return;
    const id = setInterval(() => setTime(playerRef.current?.getCurrentTime() ?? 0), 250);
    return () => clearInterval(id);
  }, [state]);

  // Track real full screen.
  useEffect(() => {
    const onChange = () => {
      const d = document as Document & { webkitFullscreenElement?: Element };
      setFull(!!(document.fullscreenElement ?? d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // Lock page scroll in viewport-filling mode (iPhone).
  useEffect(() => {
    if (!pseudoFull) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pseudoFull]);

  const playing = state === STATE.PLAYING || state === STATE.BUFFERING;

  const poke = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
  }, []);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (p.getPlayerState() === STATE.PLAYING) p.pauseVideo();
    else p.playVideo();
    poke();
  }, [ready, poke]);

  const seekBy = useCallback(
    (d: number) => {
      const p = playerRef.current;
      if (!p || !ready) return;
      const t = Math.min(Math.max(p.getCurrentTime() + d, 0), p.getDuration() || 0);
      p.seekTo(t, true);
      setTime(t);
      poke();
    },
    [ready, poke],
  );

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
    poke();
  };

  const chooseRate = (r: number) => {
    playerRef.current?.setPlaybackRate(r);
    setRate(r);
    setShowRates(false);
    poke();
  };

  const toggleFull = async () => {
    const el = boxRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const d = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element };
    if (!el) return;
    if (full) {
      if (document.exitFullscreen) await document.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
      return;
    }
    if (pseudoFull) {
      setPseudoFull(false);
      return;
    }
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => {});
        return;
      }
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }
    } catch {}
    setPseudoFull(true); // iPhone: fill the screen instead
  };

  // Keyboard shortcuts while the player is focused.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") seekBy(-10);
    else if (e.key === "ArrowLeft") seekBy(10);
    else if (e.key === "f") toggleFull();
    else if (e.key === "m") toggleMute();
  };

  // Double-tap the sides to skip on touch screens (RTL: right side = back).
  const lastTap = useRef<{ t: number; x: number } | null>(null);
  const onSurfacePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const now = Date.now();
    if (e.pointerType === "touch" && lastTap.current && now - lastTap.current.t < 300 && started) {
      if (x > 0.65) seekBy(-10);
      else if (x < 0.35) seekBy(10);
      lastTap.current = null;
      return;
    }
    lastTap.current = { t: now, x };
    if (e.pointerType === "touch" && playing && !controlsVisible) {
      poke(); // first tap only reveals the controls
      return;
    }
    toggle();
  };

  const shownTime = seeking ?? time;
  const pct = duration ? (shownTime / duration) * 100 : 0;
  const covered = !started || state === STATE.PAUSED || state === STATE.ENDED || state === -1 || state === 5;
  const controlsOn = controlsVisible || !playing;

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
      className={cn(
        "group relative w-full overflow-hidden bg-black text-white outline-none select-none",
        full ? "h-full" : pseudoFull ? "fixed inset-0 z-[100] h-dvh" : "aspect-video rounded-2xl shadow-lg",
      )}
    >
      {/* YouTube frame: pointer-events disabled so it can never be clicked, long-pressed or shared. */}
      <div
        ref={mountRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full [&>div]:h-full [&>div]:w-full"
        style={{ transform: "scale(1.02)" }}
      />

      {/* Cover screen before start / while paused / at the end hides YouTube's own overlays. */}
      <div
        className={cn(
          "absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-900 via-black to-brand-800 transition-opacity duration-200",
          covered ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="px-6 text-center">
          {title && <p className="mb-4 line-clamp-2 text-sm font-semibold text-white/80 sm:text-base">{title}</p>}
          {failed ? (
            <p className="text-sm text-white/80">تعذر تشغيل الفيديو. تحقق من اتصالك أو تواصل مع المعلم.</p>
          ) : !ready ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-white/80" />
          ) : state === STATE.ENDED ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> إعادة التشغيل
            </span>
          ) : null}
        </div>
      </div>

      {/* Click/tap surface over the whole video. */}
      <div className="absolute inset-0 z-10 cursor-pointer" onPointerUp={onSurfacePointer} />

      {/* Big play button. */}
      {ready && !playing && !failed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="تشغيل"
          className="absolute top-1/2 left-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-600 shadow-xl ring-8 ring-white/10 transition hover:scale-105 sm:h-20 sm:w-20"
        >
          <Play className="h-8 w-8 translate-x-[-2px] fill-white sm:h-9 sm:w-9" />
        </button>
      )}

      {state === STATE.BUFFERING && (
        <Loader2 className="pointer-events-none absolute top-1/2 left-1/2 z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin" />
      )}

      {/* Watermark. */}
      {watermark && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
          <div className="watermark absolute top-[12%] left-[62%] rounded-md bg-black/20 px-2 py-1 text-xs font-semibold whitespace-nowrap text-white/45 sm:text-sm">
            {watermark}
          </div>
        </div>
      )}

      {/* Controls. */}
      {ready && !failed && (
        <div
          dir="ltr"
          className={cn(
            // The gradient itself never blocks taps; only the actual controls do.
            "pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-6 pb-2 transition-opacity duration-200 sm:px-4 sm:pt-8 sm:pb-3",
            controlsOn ? "opacity-100 [&>*]:pointer-events-auto" : "opacity-0",
          )}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={shownTime}
            aria-label="شريط التقدم"
            onChange={(e) => setSeeking(Number(e.target.value))}
            onPointerUp={() => {
              if (seeking !== null) {
                playerRef.current?.seekTo(seeking, true);
                setTime(seeking);
                setSeeking(null);
              }
              poke();
            }}
            onKeyUp={() => {
              if (seeking !== null) {
                playerRef.current?.seekTo(seeking, true);
                setTime(seeking);
                setSeeking(null);
              }
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand-400"
            style={{ background: `linear-gradient(to right, #4cb070 ${pct}%, rgba(255,255,255,.3) ${pct}%)` }}
          />
          <div className="mt-2 flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={toggle} aria-label={playing ? "إيقاف مؤقت" : "تشغيل"} className="rounded-lg p-1.5 hover:bg-white/15">
              {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>
            <button type="button" onClick={() => seekBy(-10)} aria-label="رجوع 10 ثوانٍ" className="rounded-lg p-1.5 hover:bg-white/15">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => seekBy(10)} aria-label="تقديم 10 ثوانٍ" className="rounded-lg p-1.5 hover:bg-white/15">
              <RotateCw className="h-5 w-5" />
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} className="rounded-lg p-1.5 hover:bg-white/15">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="ml-1 text-xs tabular-nums text-white/85 sm:text-sm">
              {fmt(shownTime)} / {fmt(duration)}
            </span>
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowRates((s) => !s)}
                aria-label="سرعة التشغيل"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-white/15 sm:text-sm"
              >
                <Gauge className="h-4 w-4" /> {rate}x
              </button>
              {showRates && (
                <div className="absolute right-0 bottom-full mb-2 overflow-hidden rounded-xl bg-black/90 py-1 text-sm shadow-xl ring-1 ring-white/10">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => chooseRate(r)}
                      className={cn("block w-full px-4 py-1.5 text-left hover:bg-white/15", r === rate && "text-brand-300")}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleFull}
              aria-label={full || pseudoFull ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
              className="rounded-lg p-1.5 hover:bg-white/15"
            >
              {full || pseudoFull ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
