import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/server/uploads";

/**
 * Serves uploaded files. Public files are open to everyone; private files only to their owner,
 * admins/staff, or students enrolled in a course whose lesson uses the file as an attachment.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const storedName = path.basename(name);
  const media = await db.mediaFile.findUnique({ where: { storedName }, omit: { data: false } });
  if (!media) return new Response("Not found", { status: 404 });

  if (!media.isPublic) {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    let allowed = user.id === media.ownerId || user.type === "ADMIN" || user.type === "STAFF";
    if (!allowed && user.type === "STUDENT") {
      allowed =
        (await db.lesson.count({
          where: {
            attachmentId: media.id,
            course: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } },
          },
        })) > 0;
    }
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  try {
    const data = media.data ? Buffer.from(media.data) : await readFile(path.join(UPLOAD_DIR, storedName));
    return new Response(data, {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": media.isPublic ? "public, max-age=31536000, immutable" : "private, max-age=3600",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
