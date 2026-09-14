"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/link";
import { GraduationCap, Plus, MapPin, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApp, mutate } from "@/components/providers";
import { SignIn, Loading, EmptyState } from "@/components/posts";
import { toast } from "sonner";
export default function Schools() {
  const { schools, user, loading, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await mutate("schools", data);
      await refresh();
      setOpen(false);
      window.location.assign("/schools/" + r.id);
      toast.success("Школа создана. Теперь можно назначить учителей.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = schools.filter((s) =>
    (s.name + " " + s.city).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="wide-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ОРГАНИЗАЦИИ</div>
          <h1>Своя школа. Свои люди.</h1>
          <p>Найдите знакомое сообщество или создайте новое.</p>
        </div>
        {user && (
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus size={19} />
            Создать школу
          </button>
        )}
      </div>
      <input
        className="school-search"
        aria-label="Поиск школ"
        placeholder="Название школы или город"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!user && (
        <SignIn text="Войдите, чтобы создать школу и получить свой ID участника." />
      )}
      {loading ? (
        <Loading />
      ) : (
        <div className="schools-grid">
          {filtered.map((s) => (
            <Link
              className="card school-card"
              key={s.id}
              href={"/schools/" + s.id}
            >
              <div className="school-card-art">
                <GraduationCap size={48} strokeWidth={1.2} />
                <span>✳</span>
              </div>
              <div className="school-card-body">
                <div className="school-card-meta">
                  <span>
                    <MapPin size={14} />
                    {s.city}
                  </span>
                  {s.role && <span className="role-pill">Моя школа</span>}
                </div>
                <h2>{s.name}</h2>
                <p>{s.description}</p>
                <div className="school-card-footer">
                  <span>
                    {s.memberCount} участников · {s.postCount} публикаций
                  </span>
                  <ArrowUpRight size={19} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {!loading && !filtered.length && (
        <EmptyState title="Школы не найдены">
          Измените запрос или создайте новую организацию.
        </EmptyState>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Новая школа</DialogTitle>
          <DialogDescription>
            Вы станете администратором и сможете назначать учителей. Профиль
            школы будет публичным.
          </DialogDescription>
          <form className="form-stack" onSubmit={save}>
            <label>
              Название
              <input
                required
                name="name"
                maxLength={100}
                placeholder="Например, лицей «Орбита»"
              />
            </label>
            <label>
              Город
              <input required name="city" maxLength={80} placeholder="Алматы" />
            </label>
            <label>
              О школе
              <textarea
                required
                name="description"
                maxLength={600}
                placeholder="Что делает вашу школу особенной?"
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Создание…" : "Создать школу"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
