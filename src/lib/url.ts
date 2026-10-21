/** Accept only http(s) URLs or site-relative paths. */
export function isSafeUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
