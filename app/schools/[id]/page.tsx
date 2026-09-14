"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "@/components/link";
import { useParams, useRouter } from "next/navigation";
import {
  GraduationCap,
  MapPin,
  Users,
  MessagesSquare,
  Settings,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useApp, request, mutate } from "@/components/providers";
import { Composer, PostFeed, Loading } from "@/components/posts";
import type { School } from "@/lib/types";
import { toast } from "sonner";
export default function SchoolPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refresh } = useApp();
  const [school, setSchool] = useState<School | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("posts");
  const [revision, setRevision] = useState(0);
  const [manage, setManage] = useState(false);
  const [edit, setEdit] = useState(false);
  const [createClass, setCreateClass] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [role, setRole] = useState("teacher");
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const router = useRouter();
  const load = useCallback(async () => {
    try {
      setSchool(await request("schools/" + id));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load, user]);
  const loadMembers = async () => {
    try {
      setMembers(await request("schools/" + id + "/members"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await load();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <div className="wide-page error-state">{error}</div>;
  if (!school) return <Loading />;
  const isStaff = ["owner", "teacher"].includes(school.role || "");
  return (
    <div className="page-grid">
      <div className="main-column">
        <section className="card school-profile">
          <div className="school-cover">
            <div>
              <span>BAILANYSTA / ОБРАЗОВАНИЕ</span>
              <strong>Здесь начинается будущее.</strong>
            </div>
            <GraduationCap size={94} strokeWidth={1} />
            <span className="cover-star">✳</span>
          </div>
          <div className="school-profile-info">
            <div className="school-emblem">
              <GraduationCap size={35} />
            </div>
            <div className="school-profile-actions">
              {school.role && (
                <Link className="secondary" href="/chats">
                  <MessagesSquare size={17} />
                  Чаты
                </Link>
              )}
              {isStaff && (
                <button
                  className="secondary"
                  onClick={() => {
                    setManage(true);
                    void loadMembers();
                  }}
                >
                  <Settings size={17} />
                  Управление
                </button>
              )}
            </div>
            <span className="city">
              <MapPin size={15} />
              {school.city}
            </span>
            <h1>{school.name}</h1>
            <p>{school.description}</p>
            <div className="school-stats">
              <span>
                <strong>{school.memberCount}</strong> участников
              </span>
              <span>
                <strong>{school.postCount}</strong> публикаций
              </span>
              {school.role && (
                <span className="role-pill">
                  <ShieldCheck size={14} />
                  {school.role === "owner"
                    ? "Администратор"
                    : school.role === "teacher"
                      ? "Учитель"
                      : "Ученик"}
                </span>
              )}
            </div>
          </div>
        </section>
        {isStaff && (
          <Composer
            school={school}
            onSaved={() => {
              setRevision((v) => v + 1);
              void load();
            }}
          />
        )}
        <div className="feed-heading">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line">
              <TabsTrigger value="posts">Публикации</TabsTrigger>
              <TabsTrigger value="achievements">
                Достижения и грамоты
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <PostFeed
          query={
            "school=" + id + (tab === "achievements" ? "&kind=achievement" : "")
          }
          revision={revision}
        />
      </div>
      <aside className="right-column">
        <section className="card rail-card">
          <h3>На связи со школой</h3>
          <p>
            Новости и достижения доступны всем. Чаты школы и классов — только их
            участникам.
          </p>
          {school.role ? (
            <Link className="primary" href="/chats">
              <MessagesSquare size={18} />
              Перейти к чатам
            </Link>
          ) : (
            <>
              <p>Чтобы присоединиться, передайте свой ID учителю школы.</p>
              <Link className="secondary" href="/profile">
                Мой ID участника
              </Link>
            </>
          )}
        </section>
        {isStaff && (
          <section className="card rail-card">
            <h3>Ваши классы</h3>
            <p>Создайте класс и добавляйте учеников по их ID.</p>
            <button className="secondary" onClick={() => setCreateClass(true)}>
              <Plus size={18} />
              Создать класс
            </button>
          </section>
        )}
        <p className="rail-note">
          ID помогает найти участника. Права назначает администратор или
          учитель, а не сам пользователь.
        </p>
      </aside>
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="management-dialog">
          <DialogTitle>Участники школы</DialogTitle>
          <DialogDescription>
            Администратор назначает учителей. Учителя добавляют учеников в
            собственные классы.
          </DialogDescription>
          <button
            className="secondary"
            onClick={() => {
              setManage(false);
              setCreateClass(true);
            }}
          >
            <Plus size={18} /> Создать класс
          </button>
          {school.role === "owner" && (
            <>
              <button
                className="secondary"
                onClick={() => {
                  setManage(false);
                  setEdit(true);
                }}
              >
                Редактировать школу
              </button>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  const publicId = new FormData(f).get("publicId");
                  void action(async () => {
                    await mutate("schools/" + id + "/members", {
                      publicId,
                      role,
                    });
                    f.reset();
                    await loadMembers();
                    toast.success("Участник добавлен, роль сохранена");
                  });
                }}
              >
                <label>
                  ID участника
                  <input
                    name="publicId"
                    required
                    placeholder="BL-…"
                    maxLength={30}
                  />
                </label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger aria-label="Роль участника">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Учитель</SelectItem>
                    <SelectItem value="student">Ученик</SelectItem>
                  </SelectContent>
                </Select>
                <button disabled={busy} className="primary">
                  Добавить / назначить роль
                </button>
              </form>
            </>
          )}
          <div className="member-list">
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {m.public_id} ·{" "}
                    {m.role === "owner"
                      ? "Администратор"
                      : m.role === "teacher"
                        ? "Учитель"
                        : "Ученик"}
                  </small>
                </span>
                {school.role === "owner" && m.role !== "owner" && (
                  <button
                    className="text-danger"
                    onClick={() => setRemoveId(m.public_id)}
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={createClass} onOpenChange={setCreateClass}>
        <DialogContent>
          <DialogTitle>Новый класс</DialogTitle>
          <DialogDescription>
            Вы будете его ответственным учителем. Другие учителя не получат
            доступ автоматически.
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              void action(async () => {
                const c = await mutate("channels", { schoolId: id, name });
                setCreateClass(false);
                window.location.assign("/chats/" + c.id);
              });
            }}
          >
            <label>
              Название
              <input required name="name" maxLength={50} placeholder="10 «А»" />
            </label>
            <button className="primary" disabled={busy}>
              Создать класс
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Настройки школы</DialogTitle>
          <DialogDescription>Обновите публичную информацию.</DialogDescription>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              void action(async () => {
                await mutate("schools/" + id, data, "PATCH");
                setEdit(false);
              });
            }}
          >
            <label>
              Название
              <input
                name="name"
                required
                defaultValue={school.name}
                maxLength={100}
              />
            </label>
            <label>
              Город
              <input
                name="city"
                required
                defaultValue={school.city}
                maxLength={80}
              />
            </label>
            <label>
              Описание
              <textarea
                name="description"
                required
                defaultValue={school.description}
                maxLength={600}
              />
            </label>
            <button className="primary" disabled={busy}>
              Сохранить
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!removeId}
        onOpenChange={(v) => !v && setRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Удалить участника из школы?</AlertDialogTitle>
          <AlertDialogDescription>
            Он потеряет доступ ко всем чатам этой школы.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void action(async () => {
                  await mutate(
                    "schools/" + id + "/members",
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
