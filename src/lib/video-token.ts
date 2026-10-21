/** Lightly encode a YouTube id so it is not a plain, searchable string in the lesson page. */
export function encodeVideoToken(videoId: string): string {
  return Buffer.from(videoId.split("").reverse().join(""), "latin1").toString("base64");
}
