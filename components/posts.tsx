"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "@/components/link";
import {
  Heart,
  MessageCircle,
  Send,
  ImagePlus,
  Trophy,
  Pencil,
  Trash2,
  Loader2,
  Hash,
  Globe2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp, request, mutate } from "./providers";
import { Avatar } from "./app-shell";
import type { Post, School } from "@/lib/types";
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <EmptyMedia className="empty-icon">
          <MessagesIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
function MessagesIcon() {
  return <MessageCircle size={27} />;
}
export function Loading() {
  return (
    <div aria-label="Загрузка" role="status" className="loading-stack">
      {[0, 1, 2].map((i) => (
        <div className="card skeleton-card" key={i}>
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
export function SignIn({
  text = "Войдите, чтобы присоединиться к разговору.",
}: {
  text?: string;
}) {
  return (
    <div className="signin-box">
      <p>{text}</p>
      <a
        className="primary"
        href="/signin-with-chatgpt?return_to=/profile"
        target="_top"
      >
        Войти с ChatGPT
      </a>
    </div>
  );
}
export function Composer({
  school,
  onSaved,
}: {
  school?: School;
  onSaved: () => void;
}) {
  const { user } = useApp();
  const [text, setText] = useState("");
  const [kind, setKind] = useState("post");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  if (!user) return <SignIn />;
  if (school && !["owner", "teacher"].includes(school.role || "")) return null;
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Максимальный размер фото — 3 МБ");
      return;
    }
    setUploading(true);
    try {
      const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data: any = await r.json();
      if (!r.ok) throw new Error(data.error);
      setImage(data.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      await mutate("posts", { body: text, schoolId: school?.id, kind, image });
      setText("");
      setImage(null);
      setKind("post");
      toast.success("Публикация уже в ленте");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card composer">
      <div className="composer-top">
        <Avatar name={user.name} />
        <div>
          <strong>{school ? school.name : user.name}</strong>
          <small>
            <Globe2 size={12} /> Публичная публикация
          </small>
        </div>
      </div>
      <textarea
        aria-label="Текст публикации"
        placeholder={
          school
            ? "Что нового в вашей школе?"
            : "Поделитесь открытием, мыслью или хорошей новостью…"
        }
        maxLength={3000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {image && (
        <div className="attachment">
          <img src={image} alt="Прикреплённое фото" />
          <button aria-label="Убрать фото" onClick={() => setImage(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="composer-bottom">
        <div className="composer-tools">
          <label className="tool-label">
            <ImagePlus size={19} />
            <span>{uploading ? "Загрузка…" : "Фото"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={uploading}
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          {school && (
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger
                className="kind-select"
                aria-label="Тип публикации"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Новость</SelectItem>
                <SelectItem value="achievement">Достижение</SelectItem>
              </SelectContent>
            </Select>
          )}
          <span className="counter">{text.length}/3000</span>
        </div>
        <button
          className="primary"
          disabled={!text.trim() || busy || uploading}
          onClick={() => void save()}
        >
          {busy ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
          <span>Опубликовать</span>
        </button>
      </div>
    </section>
  );
}
function date(time: number) {
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith("#") ? (
          <Link
            key={i}
            className="hashtag"
            href={"/?q=" + encodeURIComponent(part)}
          >
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </>
  );
}
export function PostCard({
  post,
  onChanged,
}: {
  post: Post;
  onChanged: () => void;
}) {
  const { user } = useApp();
  const [comments, setComments] = useState<any[] | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [remove, setRemove] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleComments() {
    if (comments) {
      setComments(null);
      return;
    }
    setCommentLoading(true);
    try {
      setComments(await request("posts/" + post.id + "/comments"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCommentLoading(false);
    }
  }
  return (
    <article className="card post">
      <header className="post-header">
        <Link
          href={
            post.school_id
              ? "/schools/" + post.school_id
              : "/profiles/" + post.public_id
          }
        >
          <Avatar name={post.school_name || post.name} />
        </Link>
        <div className="post-author">
          <Link
            href={
              post.school_id
                ? "/schools/" + post.school_id
                : "/profiles/" + post.public_id
            }
          >
            {post.school_name || post.name}
          </Link>
          <small>
            {post.school_name && (
              <>
                <Link href={"/profiles/" + post.public_id}>{post.name}</Link>
                <span> · </span>
              </>
            )}
            {date(post.created_at)}
            {post.updated_at ? " · изменено" : ""}
          </small>
        </div>
        {user?.id === post.user_id && (
          <div className="post-edit">
            <button
              aria-label="Редактировать публикацию"
              className="icon-button"
              onClick={() => {
                setDraft(post.body);
                setEdit(true);
              }}
            >
              <Pencil size={16} />
            </button>
            <button
              aria-label="Удалить публикацию"
              className="icon-button"
              onClick={() => setRemove(true)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </header>
      {post.kind === "achievement" && (
        <div className="achievement-label">
          <Trophy size={15} /> Достижение школы
        </div>
      )}
      <p className="post-body">
        <RichText text={post.body} />
      </p>
      {post.image ? (
        <img
          className="post-image"
          src={post.image}
          alt={
            post.kind === "achievement"
              ? "Фото достижения школы"
              : "Фото к публикации"
          }
          loading="lazy"
        />
      ) : post.kind === "achievement" ? (
        <div className="award-art">
          <span className="award-orbit orbit-one" />
          <span className="award-orbit orbit-two" />
          <Trophy size={55} strokeWidth={1.3} />
          <div>
            <small>ЕЩЁ ОДИН ПОВОД ГОРДИТЬСЯ</small>
            <strong>
              Большие победы
              <br />
              начинаются вместе.
            </strong>
          </div>
          <span className="award-star">✦</span>
        </div>
      ) : null}
      <div className="post-actions">
        <button
          className={post.liked ? "liked" : ""}
          aria-label={"Нравится: " + post.likes}
          aria-pressed={!!post.liked}
          disabled={busy || !user}
          onClick={() =>
            void perform(() =>
              mutate(
                "posts/" + post.id + "/like",
                {},
                post.liked ? "DELETE" : "POST",
              ),
            )
          }
        >
          <Heart size={20} fill={post.liked ? "currentColor" : "none"} />
          {post.likes}
          <span>Нравится</span>
        </button>
        <button onClick={() => void toggleComments()} disabled={commentLoading}>
          <MessageCircle size={20} />
          {post.comments}
          <span>Комментарии</span>
        </button>
        <span className="post-public">
          <Globe2 size={15} /> Для всех
        </span>
      </div>
      {comments && (
        <section className="comments">
          <h4>Комментарии</h4>
          {comments.length === 0 && (
            <p className="muted">Начните разговор первым.</p>
          )}
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <Avatar name={c.name} size="small" />
              <div>
                <Link href={"/profiles/" + c.public_id}>
                  <strong>{c.name}</strong>
                </Link>
                <p>{c.body}</p>
              </div>
            </div>
          ))}
          {user ? (
            <form
              className="comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                void perform(async () => {
                  await mutate("posts/" + post.id + "/comments", {
                    body: comment,
                  });
                  setComment("");
                  setComments(await request("posts/" + post.id + "/comments"));
                });
              }}
            >
              <input
                aria-label="Ваш комментарий"
                maxLength={1000}
                placeholder="Написать комментарий…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="icon-button"
                disabled={busy || !comment.trim()}
                aria-label="Отправить комментарий"
              >
                <Send size={19} />
              </button>
            </form>
          ) : (
            <SignIn />
          )}
        </section>
      )}
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Редактировать публикацию</DialogTitle>
          <DialogDescription>
            Изменения будут видны всем читателям.
          </DialogDescription>
          <textarea
            className="form-textarea"
            aria-label="Изменённый текст"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={3000}
          />
          <button
            className="primary"
            disabled={busy || !draft.trim()}
            onClick={() =>
              void perform(async () => {
                await mutate("posts/" + post.id, { body: draft }, "PATCH");
                setEdit(false);
                toast.success("Изменения сохранены");
              })
            }
          >
            Сохранить
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={remove} onOpenChange={setRemove}>
        <AlertDialogContent>
          <AlertDialogTitle>Удалить публикацию?</AlertDialogTitle>
          <AlertDialogDescription>
            Публикация и её комментарии будут удалены без возможности
            восстановления.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void perform(() => mutate("posts/" + post.id, {}, "DELETE"))
              }
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
export function PostFeed({
  query = "",
  revision = 0,
}: {
  query?: string;
  revision?: number;
}) {
  const { loading: sessionLoading } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const load = useCallback(
    async (next = 0) => {
      setLoading(true);
      try {
        const data = await request<Post[]>("posts?" + query + "&page=" + next);
        setPosts((old) =>
          next ? [...old, ...data.slice(0, 20)] : data.slice(0, 20),
        );
        setMore(data.length > 20);
        setPage(next);
        setError("");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );
  useEffect(() => {
    if (!sessionLoading) void load();
  }, [load, revision, sessionLoading]);
  if (error)
    return (
      <div className="card error-state" role="alert">
        {error}
        <button onClick={() => void load()}>Повторить</button>
      </div>
    );
  if (loading && !posts.length) return <Loading />;
  return (
    <div className="feed">
      {posts.map((p) => (
        <PostCard post={p} key={p.id} onChanged={() => void load()} />
      ))}
      {!posts.length && !loading && (
        <EmptyState title="Здесь пока тихо">
          Публикации появятся здесь. Попробуйте другой запрос или поделитесь
          первой новостью.
        </EmptyState>
      )}
      {more && (
        <button
          className="secondary load-more"
          disabled={loading}
          onClick={() => void load(page + 1)}
        >
          {loading ? "Загрузка…" : "Показать ещё"}
        </button>
      )}
    </div>
  );
}
