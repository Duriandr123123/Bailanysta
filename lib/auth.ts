import { getChatGPTUser } from "@/app/chatgpt-auth";
import { one, run, uid } from "./db";
import type { Person } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, message: string): never => {
  throw new ApiError(status, message);
};
export function str(
  value: unknown,
  max: number,
  label = "Текст",
  min = 1,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    return fail(400, `${label}: от ${min} до ${max} символов`);
  return value.trim();
}
export async function currentUser(): Promise<Person | null> {
  const auth = await getChatGPTUser();
  if (!auth) return null;
  let person = await one<Person>(
    "SELECT id,public_id,name,bio FROM users WHERE id=?",
    auth.userId,
  );
  if (!person) {
    await run(
      "INSERT OR IGNORE INTO users (id,public_id,name,bio,created_at) VALUES (?,?,?,?,?)",
      auth.userId,
      "BL-" + uid().replaceAll("-", "").slice(0, 12).toUpperCase(),
      (auth.fullName || "Новый участник").slice(0, 80),
      "",
      Date.now(),
    );
    person = await one<Person>(
      "SELECT id,public_id,name,bio FROM users WHERE id=?",
      auth.userId,
    );
  }
  return person;
}
export async function requireUser() {
  return (await currentUser()) || fail(401, "Войдите, чтобы продолжить");
}
export async function role(school: string, user: string) {
  return (
    await one<{ role: string }>(
      "SELECT role FROM members WHERE school_id=? AND user_id=?",
      school,
      user,
    )
  )?.role;
}
export async function staff(school: string, user: string) {
  const r = await role(school, user);
  if (r !== "owner" && r !== "teacher")
    fail(403, "Только учитель или администратор этой школы");
  return r;
}
export async function owner(school: string, user: string) {
  if ((await role(school, user)) !== "owner")
    fail(403, "Только администратор этой школы");
}
export type ChatRow = {
  id: string;
  school_id: string;
  name: string;
  kind: string;
  teacher_id: string | null;
};
export async function channelAccess(id: string, user: string, manage = false) {
  const c = await one<ChatRow>("SELECT * FROM channels WHERE id=?", id);
  if (!c) return fail(404, "Чат не найден");
  const r = await role(c.school_id, user);
  if (!r) fail(403, "Чат доступен только участникам школы");
  if (manage) {
    if (
      c.kind !== "class" ||
      (r !== "owner" && !(r === "teacher" && c.teacher_id === user))
    )
      fail(403, "Управлять классом может его учитель или администратор");
  } else if (
    c.kind === "class" &&
    r !== "owner" &&
    !(r === "teacher" && c.teacher_id === user) &&
    !(await one(
      "SELECT 1 FROM channel_members WHERE channel_id=? AND user_id=?",
      id,
      user,
    ))
  )
    fail(403, "Вы не участник этого класса");
  return c;
}
export function checkMutation(req: Request) {
  const origin = req.headers.get("origin");
  if (
    (origin && origin !== new URL(req.url).origin) ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    fail(403, "Запрос с другого сайта запрещён");
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    fail(415, "Ожидается JSON");
}
