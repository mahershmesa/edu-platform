import { revalidatePath } from "next/cache";
import { getCurrentUser, teacherCanEdit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DOC_TYPES, hasFile, IMAGE_TYPES, MAX_FILE_BYTES, saveUpload, UploadError } from "@/server/uploads";

const MAX_FILES = 20;

/**
 * Multipart upload for the teacher media library. A route handler (not a server action) so
 * files up to 20MB are not limited by the server-action body size.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.type !== "TEACHER") return Response.json({ error: "غير مصرح" }, { status: 401 });
  if (!teacherCanEdit(user)) return Response.json({ error: "حسابك موقوف حالياً، لا يمكنك رفع الملفات." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "تعذر قراءة الملفات" }, { status: 400 });
  }
  const files = form.getAll("files").filter(hasFile);
  if (files.length === 0) return Response.json({ error: "اختر ملفاً واحداً على الأقل" }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `الحد الأقصى ${MAX_FILES} ملفاً في المرة الواحدة` }, { status: 400 });
  const groupRaw = form.get("groupName");
  const groupName = typeof groupRaw === "string" && groupRaw.trim() ? groupRaw.trim().slice(0, 60) : null;
  const isPublic = form.get("isPublic") === "on" || form.get("isPublic") === "true";

  const saved: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const { media } = await saveUpload(file, {
        ownerId: user.id,
        allowed: [...IMAGE_TYPES, ...DOC_TYPES],
        maxBytes: MAX_FILE_BYTES,
        groupName,
        isPublic,
      });
      saved.push(media.id);
    } catch (e) {
      if (e instanceof UploadError) errors.push(`${file.name}: ${e.message}`);
      else throw e;
    }
  }
  if (saved.length) await audit(user, "media.upload", "MediaFile", undefined, { count: saved.length });
  revalidatePath("/teacher/media");
  return Response.json({ saved: saved.length, errors }, { status: saved.length ? 200 : 400 });
}
