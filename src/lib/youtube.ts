/** Extract an 11-char YouTube video id from common URL shapes or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return valid(url.pathname.slice(1));
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") return valid(url.searchParams.get("v"));
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

function valid(id: string | null | undefined): string | null {
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
