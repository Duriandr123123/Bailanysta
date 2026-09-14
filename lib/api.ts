import { db, all, one, run, uid } from "./db";
import {
  currentUser,
  requireUser,
  str,
  fail,
  role,
  staff,
  owner,
  channelAccess,
  checkMutation,
  ApiError,
} from "./auth";
import { seed } from "./seed";
import type { Person } from "./types";
const now = () => Date.now();
const postSelect = `SELECT p.*,u.name,u.public_id,s.name AS school_name,(SELECT count(*) FROM likes WHERE post_id=p.id) AS likes,(SELECT count(*) FROM comments WHERE post_id=p.id) AS comments,(SELECT count(*) FROM likes WHERE post_id=p.id AND user_id=?) AS liked FROM posts p JOIN users u ON u.id=p.user_id LEFT JOIN schools s ON s.id=p.school_id`;
async function notify(user: string, body: string, href: string) {
  await run(
    "INSERT INTO notifications (id,user_id,body,href,created_at) VALUES (?,?,?,?,?)",
    uid(),
    user,
    body,
    href,
    now(),
  );
}
async function imageCheck(value: unknown, user: string) {
  if (!value) return null;
  const image = str(value, 100, "Изображение");
  const id = image.match(/^\/api\/media\/([a-f0-9-]+)$/)?.[1];
  if (
    !id ||
    !(await one("SELECT id FROM uploads WHERE id=? AND user_id=?", id, user))
  )
    fail(400, "Используйте собственное загруженное изображение");
  return image;
}
export async function api(req: Request, parts: string[]): Promise<Response> {
  try {
    const method = req.method;
    const path = parts.join("/");
    const url = new URL(req.url);
    if (method === "GET" && path === "health") {
      await one("SELECT 1 AS ok");
      return json({ ok: true });
    }
    if (method === "GET" && path === "session") {
      if (!(await one("SELECT id FROM schools LIMIT 1"))) await seed();
      return json({ user: await currentUser() });
    }
    const user = await currentUser();
    if (method === "GET") {
      if (path === "posts") {
        const values: unknown[] = [user?.id || ""];
        let where = " WHERE 1=1";
        for (const [param, column] of [
          ["school", "p.school_id"],
          ["user", "u.public_id"],
        ]) {
          const v = url.searchParams.get(param);
          if (v) {
            where += ` AND ${column}=?`;
            values.push(v);
          }
        }
        const q = url.searchParams.get("q")?.trim().slice(0, 100);
        if (q) {
          where += " AND p.search_text LIKE ?";
          values.push("%" + q.toLowerCase() + "%");
        }
        if (url.searchParams.get("kind") === "achievement")
          where += " AND p.kind='achievement'";
        const page = Math.max(
          0,
          Math.min(10000, Number(url.searchParams.get("page")) || 0),
        );
        return json(
          await all(
            postSelect +
              where +
              " ORDER BY p.created_at DESC,p.id DESC LIMIT 21 OFFSET ?",
            ...values,
            page * 20,
          ),
        );
      }
      if (path === "schools") {
        return json(
          await all(
            `SELECT s.*,(SELECT count(*) FROM members WHERE school_id=s.id) AS memberCount,(SELECT count(*) FROM posts WHERE school_id=s.id) AS postCount,(SELECT role FROM members WHERE school_id=s.id AND user_id=?) AS role FROM schools s ORDER BY s.created_at DESC LIMIT 100`,
            user?.id || "",
          ),
        );
      }
      if (parts[0] === "schools" && parts.length === 2) {
        const school = await one(
          "SELECT s.*,(SELECT count(*) FROM members WHERE school_id=s.id) AS memberCount,(SELECT count(*) FROM posts WHERE school_id=s.id) AS postCount FROM schools s WHERE id=?",
          parts[1],
        );
        if (!school) fail(404, "Школа не найдена");
        return json({
          ...school,
          role: user ? await role(parts[1], user.id) : null,
        });
      }
      if (parts[0] === "profiles" && parts.length === 2) {
        const p = await one(
          "SELECT id,public_id,name,bio,created_at FROM users WHERE public_id=?",
          parts[1],
        );
        if (!p) fail(404, "Профиль не найден");
        return json(p);
      }
      if (parts[0] === "posts" && parts[2] === "comments") {
        if (!(await one("SELECT id FROM posts WHERE id=?", parts[1])))
          fail(404, "Публикация не найдена");
        return json(
          await all(
            "SELECT c.*,u.name,u.public_id FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.created_at ASC LIMIT 200",
            parts[1],
          ),
        );
      }
      if (!user) fail(401, "Войдите, чтобы продолжить");
      if (parts[0] === "schools" && parts[2] === "members") {
        await staff(parts[1], user!.id);
        return json(
          await all(
            "SELECT u.id,u.public_id,u.name,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.school_id=? ORDER BY m.role,u.name LIMIT 500",
            parts[1],
          ),
        );
      }
      if (path === "channels") {
        return json(
          await all(
            `SELECT c.*,s.name AS school_name FROM channels c JOIN schools s ON s.id=c.school_id JOIN members m ON m.school_id=c.school_id AND m.user_id=? WHERE c.kind='school' OR m.role='owner' OR (m.role='teacher' AND c.teacher_id=?) OR EXISTS(SELECT 1 FROM channel_members cm WHERE cm.channel_id=c.id AND cm.user_id=?) ORDER BY s.name,c.kind DESC,c.name`,
            user!.id,
            user!.id,
            user!.id,
          ),
        );
      }
      if (parts[0] === "channels" && parts[2] === "messages") {
        await channelAccess(parts[1], user!.id);
        return json(
          await all(
            "SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.user_id WHERE m.channel_id=? ORDER BY m.created_at DESC LIMIT 100",
            parts[1],
          ),
        );
      }
      if (parts[0] === "channels" && parts[2] === "members") {
        await channelAccess(parts[1], user!.id, true);
        return json(
          await all(
            "SELECT u.id,u.public_id,u.name FROM channel_members cm JOIN users u ON u.id=cm.user_id WHERE cm.channel_id=?",
            parts[1],
          ),
        );
      }
      if (path === "notifications")
        return json(
          await all(
            "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
            user!.id,
          ),
        );
    }
    if (!["POST", "PATCH", "DELETE"].includes(method)) fail(404, "Не найдено");
    // Read a bounded body before rejecting it, keeping local proxy connections usable.
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader)
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value.length;
        if (total > 16384) {
          await reader.cancel();
          fail(413, "Слишком большой запрос");
        }
        chunks.push(chunk.value);
      }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const raw = new TextDecoder().decode(bytes);
    checkMutation(req);
    const actor = await requireUser();
    if (raw.length > 12000) fail(413, "Слишком большой запрос");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw || "{}");
      if (!body || Array.isArray(body) || typeof body !== "object")
        throw new Error();
    } catch {
      return fail(400, "Некорректный JSON");
    }
    if (path === "profile" && method === "PATCH") {
      await run(
        "UPDATE users SET name=?,bio=? WHERE id=?",
        str(body.name, 80, "Имя"),
        str(body.bio, 300, "О себе", 0),
        actor.id,
      );
      return json({ ok: true });
    }
    if (path === "schools" && method === "POST") {
      const id = uid();
      await db().batch([
        db()
          .prepare(
            "INSERT INTO schools (id,name,city,description,owner_id,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            id,
            str(body.name, 100, "Название"),
            str(body.city, 80, "Город"),
            str(body.description, 600, "Описание"),
            actor.id,
            now(),
          ),
        db()
          .prepare(
            "INSERT INTO members (school_id,user_id,role) VALUES (?,?,'owner')",
          )
          .bind(id, actor.id),
        db()
          .prepare(
            "INSERT INTO channels (id,school_id,name,kind,teacher_id) VALUES (?,?,?,'school',NULL)",
          )
          .bind(uid(), id, "Общий чат школы"),
      ]);
      return json({ id }, 201);
    }
    if (parts[0] === "schools" && parts.length === 2 && method === "PATCH") {
      await owner(parts[1], actor.id);
      await run(
        "UPDATE schools SET name=?,city=?,description=? WHERE id=?",
        str(body.name, 100, "Название"),
        str(body.city, 80, "Город"),
        str(body.description, 600, "Описание"),
        parts[1],
      );
      return json({ ok: true });
    }
    if (parts[0] === "schools" && parts[2] === "members") {
      await owner(parts[1], actor.id);
      const target = await one<Person>(
        "SELECT * FROM users WHERE public_id=?",
        str(body.publicId, 30, "ID").toUpperCase(),
      );
      if (!target)
        fail(
          404,
          "Пользователь не найден. Попросите его сначала войти и скопировать ID из профиля.",
        );
      if ((await role(parts[1], target!.id)) === "owner")
        fail(400, "Роль владельца изменять нельзя");
      if (method === "DELETE") {
        await db().batch([
          db()
            .prepare(
              "DELETE FROM channel_members WHERE user_id=? AND channel_id IN (SELECT id FROM channels WHERE school_id=?)",
            )
            .bind(target!.id, parts[1]),
          db()
            .prepare("DELETE FROM members WHERE school_id=? AND user_id=?")
            .bind(parts[1], target!.id),
        ]);
        return json({ ok: true });
      }
      if (body.role !== "teacher" && body.role !== "student")
        fail(400, "Неизвестная роль");
      await run(
        "INSERT INTO members (school_id,user_id,role) VALUES (?,?,?) ON CONFLICT(school_id,user_id) DO UPDATE SET role=excluded.role",
        parts[1],
        target!.id,
        body.role,
      );
      await notify(
        target!.id,
        body.role === "teacher"
          ? "Вы назначены учителем школы"
          : "Вас добавили в школу",
        "/schools/" + parts[1],
      );
      return json({ ok: true });
    }
    if (path === "channels" && method === "POST") {
      const school = str(body.schoolId, 80);
      await staff(school, actor.id);
      const id = uid();
      await run(
        "INSERT INTO channels (id,school_id,name,kind,teacher_id) VALUES (?,?,?,'class',?)",
        id,
        school,
        str(body.name, 50, "Название класса"),
        actor.id,
      );
      return json({ id }, 201);
    }
    if (parts[0] === "channels" && parts[2] === "members") {
      const c = await channelAccess(parts[1], actor.id, true);
      const target = await one<Person>(
        "SELECT * FROM users WHERE public_id=?",
        str(body.publicId, 30, "ID").toUpperCase(),
      );
      if (!target) fail(404, "Пользователь с таким ID не найден");
      if (method === "DELETE") {
        await run(
          "DELETE FROM channel_members WHERE channel_id=? AND user_id=?",
          c.id,
          target!.id,
        );
        return json({ ok: true });
      }
      await db().batch([
        db()
          .prepare(
            "INSERT OR IGNORE INTO members (school_id,user_id,role) VALUES (?,?,'student')",
          )
          .bind(c.school_id, target!.id),
        db()
          .prepare(
            "INSERT OR IGNORE INTO channel_members (channel_id,user_id) VALUES (?,?)",
          )
          .bind(c.id, target!.id),
      ]);
      await notify(
        target!.id,
        `Вас добавили в класс ${c.name}`,
        "/chats/" + c.id,
      );
      return json({ ok: true });
    }
    if (
      parts[0] === "channels" &&
      parts[2] === "messages" &&
      method === "POST"
    ) {
      await channelAccess(parts[1], actor.id);
      const text = str(body.body, 2000, "Сообщение");
      const recent = await one<{ created_at: number }>(
        "SELECT created_at FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
        actor.id,
      );
      if (recent && now() - recent.created_at < 800)
        fail(429, "Подождите секунду перед следующим сообщением");
      const id = uid();
      await run(
        "INSERT INTO messages (id,channel_id,user_id,body,created_at) VALUES (?,?,?,?,?)",
        id,
        parts[1],
        actor.id,
        text,
        now(),
      );
      return json({ id }, 201);
    }
    if (path === "posts" && method === "POST") {
      const text = str(body.body, 3000, "Публикация");
      const school = body.schoolId ? str(body.schoolId, 80) : null;
      if (school) await staff(school, actor.id);
      const kind = body.kind === "achievement" ? "achievement" : "post";
      if (kind === "achievement" && !school)
        fail(400, "Достижение публикуется от имени школы");
      const image = await imageCheck(body.image, actor.id);
      const id = uid();
      await run(
        "INSERT INTO posts (id,user_id,school_id,body,search_text,kind,image,created_at) VALUES (?,?,?,?,?,?,?,?)",
        id,
        actor.id,
        school,
        text,
        text.toLowerCase(),
        kind,
        image,
        now(),
      );
      return json({ id }, 201);
    }
    if (parts[0] === "posts") {
      const p = await one<{ user_id: string; school_id: string | null }>(
        "SELECT user_id,school_id FROM posts WHERE id=?",
        parts[1],
      );
      if (!p) fail(404, "Публикация не найдена");
      if (parts.length === 2) {
        if (p!.user_id !== actor.id)
          fail(403, "Можно изменять только свои публикации");
        if (p!.school_id) await staff(p!.school_id, actor.id);
        if (method === "DELETE") {
          await run("DELETE FROM posts WHERE id=?", parts[1]);
          return json({ ok: true });
        }
        if (method === "PATCH") {
          await run(
            "UPDATE posts SET body=?,search_text=?,updated_at=? WHERE id=?",
            str(body.body, 3000, "Публикация"),
            str(body.body, 3000, "Публикация").toLowerCase(),
            now(),
            parts[1],
          );
          return json({ ok: true });
        }
      }
      if (parts[2] === "like") {
        if (method === "DELETE")
          await run(
            "DELETE FROM likes WHERE post_id=? AND user_id=?",
            parts[1],
            actor.id,
          );
        else
          await run(
            "INSERT OR IGNORE INTO likes (post_id,user_id) VALUES (?,?)",
            parts[1],
            actor.id,
          );
        return json({ ok: true });
      }
      if (parts[2] === "comments" && method === "POST") {
        const id = uid();
        await run(
          "INSERT INTO comments (id,post_id,user_id,body,created_at) VALUES (?,?,?,?,?)",
          id,
          parts[1],
          actor.id,
          str(body.body, 1000, "Комментарий"),
          now(),
        );
        if (p!.user_id !== actor.id)
          await notify(
            p!.user_id,
            `${actor.name} прокомментировал вашу публикацию`,
            p!.school_id ? "/schools/" + p!.school_id : "/profile",
          );
        return json({ id }, 201);
      }
    }
    if (path === "notifications" && method === "PATCH") {
      await run("UPDATE notifications SET seen=1 WHERE user_id=?", actor.id);
      return json({ ok: true });
    }
    return fail(404, "Не найдено");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    console.error("API failure", error);
    return json(
      { error: "Не удалось выполнить запрос. Попробуйте ещё раз." },
      503,
    );
  }
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
