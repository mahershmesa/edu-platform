export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="currentColor" opacity="0.15" />
      <path d="M24 9 12 36h6l2.6-6h6.8l2.6 6h6L24 9Zm-1.6 15L24 19.8 25.6 24h-3.2Z" fill="currentColor" />
      <path d="M10 38c5-2.6 9.6-2.6 14 0 4.4-2.6 9-2.6 14 0" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
