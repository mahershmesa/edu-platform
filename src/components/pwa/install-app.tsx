"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function useInstallState() {
  const [state, setState] = useState<{ canPrompt: boolean; ios: boolean; installed: boolean; ready: boolean }>({
    canPrompt: false,
    ios: false,
    installed: false,
    ready: false,
  });
  useEffect(() => {
    const update = () => setState({ canPrompt: !!deferred, ios: isIOS(), installed: isStandalone(), ready: true });
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}

async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

function IOSHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="تثبيت التطبيق على الآيفون" size="sm">
      <ol className="space-y-4 text-sm leading-7">
        <li className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">1</span>
          <span>
            افتح الموقع من متصفح <b>Safari</b> واضغط زر المشاركة <Share className="inline h-4 w-4 align-[-2px]" /> في أسفل الشاشة.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">2</span>
          <span>
            اختر <b>إضافة إلى الشاشة الرئيسية</b> <SquarePlus className="inline h-4 w-4 align-[-2px]" />.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">3</span>
          <span>
            اضغط <b>إضافة</b>، وستجد أيقونة «أساس» على شاشتك مثل أي تطبيق.
          </span>
        </li>
      </ol>
    </Dialog>
  );
}

/** Button that installs the app (Android/desktop Chrome) or shows iPhone instructions. Hidden once installed. */
export function InstallAppButton({ className, label = "تثبيت التطبيق" }: { className?: string; label?: string }) {
  const { canPrompt, ios, installed, ready } = useInstallState();
  const [help, setHelp] = useState(false);
  if (!ready || installed || (!canPrompt && !ios)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (canPrompt ? promptInstall() : setHelp(true))}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700",
          className,
        )}
      >
        <Download className="h-4 w-4" /> {label}
      </button>
      <IOSHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}

const DISMISS_KEY = "install-banner-dismissed";

/** Bottom banner on phones inviting visitors to install the app. Dismissal is remembered for 14 days. */
export function InstallBanner() {
  const { canPrompt, ios, installed, ready } = useInstallState();
  const [hidden, setHidden] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(Date.now() - t < 14 * 24 * 60 * 60 * 1000);
    } catch {
      setHidden(false);
    }
  }, []);

  if (!ready || installed || hidden || (!canPrompt && !ios)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-xl md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">ثبّت تطبيق أساس أكاديمي</p>
          <p className="text-xs text-muted">وصول أسرع لدروسك من الشاشة الرئيسية</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (canPrompt) {
              if (await promptInstall()) dismiss();
            } else setHelp(true);
          }}
          className="rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white"
        >
          تثبيت
        </button>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-muted" aria-label="إغلاق">
          <X className="h-4 w-4" />
        </button>
      </div>
      <IOSHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}
