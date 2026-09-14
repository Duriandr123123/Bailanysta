import { bucket, one } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upload = await one<{ user_id: string; mime: string }>(
    "SELECT * FROM uploads WHERE id=?",
    id,
  );
  if (!upload) return new Response(null, { status: 404 });
  const published = await one(
    "SELECT id FROM posts WHERE image=?",
    "/api/media/" + id,
  );
  if (!published && (await currentUser())?.id !== upload.user_id)
    return new Response(null, { status: 404 });
  const object = await bucket().get(id);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": upload.mime,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
