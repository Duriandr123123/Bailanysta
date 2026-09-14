"use client";
import { useState, useEffect } from "react";
import { Copy, Pencil, GraduationCap } from "lucide-react";
import Link from "@/components/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApp, request, mutate } from "./providers";
import { Composer, PostFeed, Loading, SignIn } from "./posts";
import { Avatar } from "./app-shell";
import type { Person } from "@/lib/types";
import { toast } from "sonner";
type ProfileInfo = Person & {
  followers: number;
  following: number;
  isFollowing: number;
};
export function Profile({ publicId }: { publicId?: string }) {
  const { user, schools, loading, refresh } = useApp();
  const [person, setPerson] = useState<ProfileInfo | null>(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const mine = !publicId || publicId === user?.public_id;
  useEffect(() => {
    if (loading) return;
    const id = publicId || user?.public_id;
    if (!id) {
      setPerson(null);
      return;
    }
    let active = true;
    setError("");
    setPerson(null);
    void request<ProfileInfo>("profiles/" + id)
      .then((p) => {
        if (active) setPerson(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [loading, user, publicId]);
  if (loading) return <Loading />;
  if (mine && !user)
    return (
      <div className="wide-page">
        <div className="page-heading">
          <div>
            <h1>Ваше место в сообществе</h1>
            <p>Войдите, получите уникальный ID и передайте его учителю.</p>
          </div>
        </div>
        <SignIn text="При первом входе личный профиль создаётся автоматически. После входа укажите своё имя." />
      </div>
    );
  if (error) return <div className="wide-page">{error}</div>;
  if (!person) return <Loading />;
  return (
    <div className="page-grid">
      <div className="main-column">
        <section className="card profile-card">
          <div className="profile-cover">
            <span>БЫТЬ СОБОЙ. БЫТЬ НА СВЯЗИ.</span>
            <span>✳</span>
          </div>
          <div className="profile-info">
            <Avatar name={person.name} size="large" />
            {mine && (
              <button
                className="secondary profile-edit"
                onClick={() => setEdit(true)}
              >
                <Pencil size={16} />
                Редактировать
              </button>
            )}
            {!mine &&
              (user ? (
                <button
                  className="secondary profile-edit"
                  disabled={busy}
                  aria-pressed={!!person.isFollowing}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await mutate(
                        "profiles/" + person.public_id + "/follow",
                        {},
                        person.isFollowing ? "DELETE" : "POST",
                      );
                      setPerson(
                        await request<ProfileInfo>(
                          "profiles/" + person.public_id,
                        ),
                      );
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "Сохраняем…"
                    : person.isFollowing
                      ? "Отписаться"
                      : "Подписаться"}
                </button>
              ) : (
                <Link
                  className="secondary profile-edit"
                  href={
                    "/signin-with-chatgpt?return_to=" +
                    encodeURIComponent("/profiles/" + person.public_id)
                  }
                >
                  Войти и подписаться
                </Link>
              ))}
            <h1>{person.name}</h1>
            <button
              className="public-id"
              onClick={() =>
                void navigator.clipboard
                  .writeText(person.public_id)
                  .then(() => toast.success("ID скопирован"))
                  .catch(() =>
                    toast.error("Не удалось скопировать. Выделите ID вручную."),
                  )
              }
            >
              {person.public_id}
              <Copy size={15} />
            </button>
            <p>{person.bio || "Пока ничего не рассказал о себе."}</p>
            <div className="profile-stats" aria-live="polite">
              <span>
                Подписчики: <strong>{person.followers}</strong>
              </span>
              <span>
                Подписки: <strong>{person.following}</strong>
              </span>
            </div>
          </div>
        </section>
        {mine && <Composer onSaved={() => setRevision((v) => v + 1)} />}
        <div className="section-heading">
          <h2>{mine ? "Мои публикации" : "Публикации"}</h2>
        </div>
        <PostFeed query={"user=" + person.public_id} revision={revision} />
      </div>
      <aside className="right-column">
        <section className="card rail-card">
          <h3>Ваш ID — начало связи</h3>
          <p>
            ID можно передать учителю: он добавит вас в класс. Это публичный
            номер, а не пароль.
          </p>
          <p>Школьный чат станет доступен после добавления в школу.</p>
        </section>
        {mine && (
          <section className="card rail-card">
            <h3>Мои школы</h3>
            {schools
              .filter((s) => s.role)
              .map((s) => (
                <Link
                  className="rail-school"
                  key={s.id}
                  href={"/schools/" + s.id}
                >
                  <GraduationCap size={21} />
                  <strong>{s.name}</strong>
                </Link>
              ))}
            <Link href="/schools" className="text-link">
              Все школы
            </Link>
          </section>
        )}
      </aside>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Имя и описание видны всем. Публичный ID остаётся неизменным.
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              void mutate("profile", data, "PATCH")
                .then(async () => {
                  await refresh();
                  setEdit(false);
                  toast.success("Профиль обновлён");
                })
                .catch((e) => toast.error(e.message))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Имя
              <input
                required
                name="name"
                defaultValue={person.name}
                maxLength={80}
              />
            </label>
            <label>
              О себе
              <textarea name="bio" defaultValue={person.bio} maxLength={300} />
            </label>
            <button className="primary" disabled={busy}>
              Сохранить
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
