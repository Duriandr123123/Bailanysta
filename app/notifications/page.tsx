"use client";
import { useState, useEffect } from "react";
import Link from "@/components/link";
import { Bell, CheckCheck } from "lucide-react";
import { useApp, request, mutate } from "@/components/providers";
import { EmptyState, SignIn, Loading } from "@/components/posts";
import { toast } from "sonner";
export default function Notifications() {
  const { user, loading } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      setItems(await request("notifications"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [user]);
  if (loading) return <Loading />;
  return (
    <div className="wide-page narrow-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">НИЧЕГО НЕ ПРОПУСТИТЬ</div>
          <h1>Уведомления</h1>
        </div>
        {user && items.some((n) => !n.seen) && (
          <button
            className="secondary"
            onClick={() =>
              void mutate("notifications", {}, "PATCH")
                .then(load)
                .catch((e) => toast.error(e.message))
            }
          >
            <CheckCheck size={18} />
            Прочитано
          </button>
        )}
      </div>
      {!user ? (
        <SignIn />
      ) : error ? (
        <p role="alert">{error}</p>
      ) : items.length ? (
        <div className="card notifications">
          {items.map((n) => (
            <Link
              className={"notification " + (!n.seen ? "unread" : "")}
              key={n.id}
              href={n.href}
            >
              <Bell size={21} />
              <div>
                <p>{n.body}</p>
                <small>{new Date(n.created_at).toLocaleString("ru")}</small>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Вы всё прочитали">
          Здесь появятся новые подписчики, приглашения в классы, назначения
          ролей и комментарии к вашим публикациям.
        </EmptyState>
      )}
    </div>
  );
}
