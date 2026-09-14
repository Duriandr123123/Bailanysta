import { bucket, run, uid } from "@/lib/db";
import { requireUser, fail, ApiError } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (
      (origin && origin !== new URL(req.url).origin) ||
      req.headers.get("sec-fetch-site") === "cross-site"
    )
      fail(403, "Недопустимый источник запроса");
    const user = await requireUser();
    if (!req.body) fail(400, "Нет файла");
    const reader = req.body!.getReader();
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      length += r.value.length;
      if (length > 3 * 1024 * 1024) {
        await reader.cancel();
        fail(413, "Максимальный размер фото — 3 МБ");
      }
      chunks.push(r.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    let mime = "";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      mime = "image/jpeg";
    if (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71
    )
      mime = "image/png";
    if (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    )
      mime = "image/webp";
    if (!mime) fail(400, "Разрешены JPG, PNG и WebP");
    const id = uid();
    await bucket().put(id, bytes, { httpMetadata: { contentType: mime } });
    await run(
      "INSERT INTO uploads (id,user_id,mime) VALUES (?,?,?)",
      id,
      user.id,
      mime,
    );
    return Response.json({ url: "/api/media/" + id });
  } catch (e) {
    return Response.json(
      {
        error: e instanceof ApiError ? e.message : "Не удалось загрузить фото",
      },
      { status: e instanceof ApiError ? e.status : 503 },
    );
  }
}
