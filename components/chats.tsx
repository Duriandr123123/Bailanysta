"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "@/components/link";
import {
  LockKeyhole,
  Send,
  Users,
  Plus,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
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
import { useApp, request, mutate } from "./providers";
import { Loading, SignIn, EmptyState } from "./posts";
import { Avatar } from "./app-shell";
import type { Channel, Message } from "@/lib/types";
import { toast } from "sonner";
export function Chats({ channelId }: { channelId?: string }) {
  const { user, schools, loading } = useApp();
  const [channels, setChannels] = useState<
    (Channel & { teacher_id: string })[]
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [manage, setManage] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    setFetching(true);
    void request("channels")
      .then(setChannels)
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, channelId]);
  const channel = channels.find((c) => c.id === channelId);
  const load = useCallback(async () => {
    if (!channelId || !user) return;
    try {
      const data = await request<Message[]>(
        "channels/" + channelId + "/messages",
      );
      setMessages(data.reverse());
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setMessages([]);
    }
  }, [channelId, user]);
  useEffect(() => {
    setMessages([]);
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  async function loadMembers() {
    try {
      setMembers(await request("channels/" + channelId + "/members"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!user)
    return (
      <div className="wide-page">
        <h1>Разговоры со своими</h1>
        <SignIn text="Чаты школы и классов доступны только участникам. Войдите, чтобы увидеть свои разговоры." />
      </div>
    );
  const canManage =
    channel?.kind === "class" &&
    (channel.teacher_id === user.id ||
      schools.find((s) => s.id === channel.school_id)?.role === "owner");
  return (
    <div className="chat-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ТОЛЬКО ДЛЯ СВОИХ</div>
          <h1>На связи</h1>
          <p>Чаты вашей школы и классов.</p>
        </div>
        <span className="privacy-label">
          <LockKeyhole size={16} />
          Закрытые чаты
        </span>
      </div>
      <div className="chat-layout card">
        <aside className="chat-list">
          <h3>
            Мои разговоры <span>{channels.length}</span>
          </h3>
          {fetching ? (
            <p className="muted">Загрузка…</p>
          ) : !channels.length ? (
            <div className="chat-list-empty">
              <p>Учитель добавит вас по ID — и здесь появится ваш класс.</p>
              <Link href="/profile" className="text-link">
                Посмотреть мой ID
              </Link>
            </div>
          ) : (
            channels.map((c) => (
              <Link
                key={c.id}
                href={"/chats/" + c.id}
                className={"chat-link " + (c.id === channelId ? "active" : "")}
              >
                <span className="school-icon">
                  {c.kind === "school" ? (
                    <GraduationCap size={21} />
                  ) : (
                    <MessageCircle size={21} />
                  )}
                </span>
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.school_name}</small>
                </span>
              </Link>
            ))
          )}
        </aside>
        <section className="chat-conversation">
          {channel ? (
            <>
              <header className="chat-header">
                <div>
                  <h2>{channel.name}</h2>
                  <Link href={"/schools/" + channel.school_id}>
                    {channel.school_name}
                  </Link>
                </div>
                {canManage && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setManage(true);
                      void loadMembers();
                    }}
                  >
                    <Users size={17} />
                    <span>Участники</span>
                  </button>
                )}
              </header>
              {error && (
                <p role="alert" className="chat-error">
                  {error}
                </p>
              )}
              <div className="message-list">
                {!messages.length && !error && (
                  <EmptyState title="Начните разговор">
                    Поделитесь новостью или задайте вопрос своему классу.
                  </EmptyState>
                )}
                {messages.map((m) => (
                  <div
                    className={
                      "message " + (m.user_id === user.id ? "own" : "")
                    }
                    key={m.id}
                  >
                    {m.user_id !== user.id && (
                      <Avatar name={m.name} size="small" />
                    )}
                    <div className="message-bubble">
                      <strong>{m.name}</strong>
                      <p>{m.body}</p>
                      <time>
                        {new Intl.DateTimeFormat("ru", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(m.created_at)}
                      </time>
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>
              <form
                className="message-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    await mutate("channels/" + channelId + "/messages", {
                      body: text,
                    });
                    setText("");
                    await load();
                  });
                }}
              >
                <textarea
                  aria-label="Сообщение в чат"
                  rows={1}
                  placeholder="Написать сообщение…"
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  className="primary"
                  aria-label="Отправить сообщение"
                  disabled={busy || !text.trim()}
                >
                  <Send size={20} />
                </button>
              </form>
              <p className="chat-footnote">
                Сообщения обновляются каждые 5 секунд
              </p>
            </>
          ) : (
            <div className="chat-placeholder">
              <LockKeyhole size={42} />
              <h2>
                {channelId ? "Чат недоступен" : "Всё начинается с разговора"}
              </h2>
              <p>
                {channelId
                  ? "Выберите доступный чат или попросите учителя добавить вас."
                  : "Выберите школу или класс слева."}
              </p>
              {error && <p role="alert">{error}</p>}
              <Link href="/schools" className="text-link">
                Перейти к школам
              </Link>
            </div>
          )}
        </section>
      </div>
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent>
          <DialogTitle>Участники · {channel?.name}</DialogTitle>
          <DialogDescription>
            Добавление по ID открывает ученику чат класса и общий чат школы.
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const publicId = new FormData(f).get("publicId");
              void perform(async () => {
                await mutate("channels/" + channelId + "/members", {
                  publicId,
                });
                f.reset();
                await loadMembers();
                toast.success("Участник добавлен в класс");
              });
            }}
          >
            <label>
              ID ученика
              <input
                name="publicId"
                placeholder="BL-…"
                required
                maxLength={30}
              />
            </label>
            <button className="primary" disabled={busy}>
              <Plus size={17} />
              Добавить в класс
            </button>
          </form>
          <div className="member-list">
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.public_id}</small>
                </span>
                <button
                  className="text-danger"
                  onClick={() => setRemoveId(m.public_id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!removeId}
        onOpenChange={(v) => !v && setRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Удалить из класса?</AlertDialogTitle>
          <AlertDialogDescription>
            Участник потеряет доступ к этому классу. Членство в школе
            сохранится.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void perform(async () => {
                  await mutate(
                    "channels/" + channelId + "/members",
                    { publicId: removeId },
                    "DELETE",
                  );
                  setRemoveId(null);
                  await loadMembers();
                })
              }
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
