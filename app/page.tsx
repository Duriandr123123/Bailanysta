"use client";
import { useState, useEffect } from "react";
import Link from "@/components/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  ArrowUpRight,
  GraduationCap,
  Sparkles,
  Hash,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/providers";
import { Composer, PostFeed, SignIn, Loading } from "@/components/posts";
export default function Home() {
  const { schools, user, loading } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(params.get("q") || "");
  const [tab, setTab] = useState(
    params.get("feed") === "following" ? "following" : "all",
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => setSearch(params.get("q") || ""), [params]);
  const query =
    "q=" +
    encodeURIComponent(params.get("q") || "") +
    (tab === "achievements"
      ? "&kind=achievement"
      : tab === "following"
        ? "&following=1"
        : "");
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "search_school_posts",
          title: "Поиск публикаций",
          description: "Показать публичные публикации по слову или хэштегу.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 100 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: async (input: any) => {
            if (typeof input?.query !== "string" || input.query.length > 100)
              throw new Error("Некорректный запрос");
            window.location.assign("/?q=" + encodeURIComponent(input.query));
            return { query: input.query };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, [router]);
  return (
    <div className="page-grid">
      <div className="main-column">
        <div className="page-heading">
          <div>
            <div className="eyebrow">BAILANYSTA COMMUNITY</div>
            <h1>
              На одной волне<span className="heading-dot">.</span>
            </h1>
            <p>Новости, идеи и маленькие победы вашего сообщества.</p>
          </div>
          <span className="heading-spark">✳</span>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.assign(
              "/?q=" +
                encodeURIComponent(search) +
                (tab === "following" ? "&feed=following" : ""),
            );
          }}
        >
          <Search size={20} />
          <input
            aria-label="Поиск публикаций"
            placeholder="Поиск по словам или #хэштегам"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Найти</button>
        </form>
        <Composer onSaved={() => setRevision((v) => v + 1)} />
        <div className="feed-heading">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line">
              <TabsTrigger value="all">Все публикации</TabsTrigger>
              <TabsTrigger value="following">Подписки</TabsTrigger>
              <TabsTrigger value="achievements">Достижения</TabsTrigger>
            </TabsList>
          </Tabs>
          <span>Сначала новые</span>
        </div>
        {tab === "following" && loading ? (
          <Loading />
        ) : tab === "following" && !user ? (
          <SignIn text="Войдите и подпишитесь на авторов, чтобы видеть их публикации здесь." />
        ) : (
          <>
            <PostFeed query={query} revision={revision} />
            {tab === "following" && (
              <p className="rail-note">
                Здесь публикации авторов, на которых вы подписаны. Подписаться
                можно в профиле автора.
              </p>
            )}
          </>
        )}
      </div>
      <aside className="right-column">
        <div className="welcome-card">
          <span className="welcome-symbol">✳</span>
          <div className="eyebrow">БЛИЖЕ ДРУГ К ДРУГУ</div>
          <h2>
            Школьная жизнь.
            <br />
            За пределами
            <br />
            расписания.
          </h2>
          <p>Знакомьтесь, делитесь открытиями и оставайтесь на связи.</p>
          <Link href="/schools">
            Найти свою школу <ArrowUpRight size={19} />
          </Link>
        </div>
        <section className="card rail-card">
          <div className="rail-title">
            <h3>Школы рядом</h3>
            <GraduationCap size={21} />
          </div>
          {schools.slice(0, 4).map((s) => (
            <Link className="rail-school" href={"/schools/" + s.id} key={s.id}>
              <span className="school-icon">
                <GraduationCap size={22} />
              </span>
              <span>
                <strong>{s.name}</strong>
                <small>
                  {s.city} · {s.memberCount} участника
                </small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
          <Link href="/schools" className="text-link">
            Все организации
          </Link>
        </section>
        <section className="rail-topics">
          <h3>Есть о чём поговорить</h3>
          {["школьнаяжизнь", "достижения", "робототехника", "первыйшаг"].map(
            (t) => (
              <Link key={t} href={"/?q=" + encodeURIComponent("#" + t)}>
                <Hash size={18} />
                {t}
              </Link>
            ),
          )}
        </section>
        <p className="rail-note">
          Демонстрационный лицей и его участники вымышлены. Создайте свою школу,
          чтобы начать.
        </p>
      </aside>
    </div>
  );
}
