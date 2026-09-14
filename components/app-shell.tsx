"use client";
import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  House,
  School,
  MessagesSquare,
  UserRound,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Bell,
  ArrowUpRight,
  GraduationCap,
  Menu,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useApp } from "./providers";
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  const n = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return <span className={"avatar " + size}>{n || "Б"}</span>;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, schools, error, refresh } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const nav = [
    ["/", "Лента", House],
    ["/schools", "Школы", School],
    ["/chats", "Чаты", MessagesSquare],
    ["/profile", "Мой профиль", UserRound],
    ["/notifications", "Уведомления", Bell],
  ] as const;
  return (
    <SidebarProvider className="shell">
      <Sidebar className="site-sidebar">
        <Link href="/" className="brand">
          <span className="brandmark">
            b<span>·</span>
          </span>
          Bailanysta
        </Link>
        <SidebarContent>
          <div className="nav-label">ВАШЕ ПРОСТРАНСТВО</div>
          <SidebarMenu>
            {nav.map(([href, label, Icon]) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={href === "/" ? path === "/" : path.startsWith(href)}
                  className="nav-item"
                >
                  <Link href={href}>
                    <Icon size={21} />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="nav-label schools-label">МОИ ШКОЛЫ</div>
          {schools
            .filter((s) => s.role)
            .map((s) => (
              <Link className="school-nav" key={s.id} href={"/schools/" + s.id}>
                <span className="school-icon">
                  <GraduationCap size={18} />
                </span>
                <span>{s.name}</span>
              </Link>
            ))}
          {!schools.some((s) => s.role) && (
            <p className="sidebar-hint">
              Вступите в свою школу по приглашению учителя или создайте новую.
            </p>
          )}
          <Link href="/schools" className="discover-link">
            Найти школу <ArrowUpRight size={16} />
          </Link>
          <div className="sidebar-bottom">
            <button
              className="theme-button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun size={20} className="hidden dark:block" />
              <Moon size={20} className="dark:hidden" />
              <span>Сменить тему</span>
            </button>
            {user ? (
              <>
                <Link className="account" href="/profile">
                  <Avatar name={user.name} />
                  <span>
                    <strong>{user.name}</strong>
                    <small>{user.public_id}</small>
                  </span>
                </Link>
                <a
                  className="signout"
                  href="/signout-with-chatgpt?return_to=/"
                  target="_top"
                >
                  <LogOut size={15} /> Выйти
                </a>
              </>
            ) : (
              <a
                className="primary login"
                href="/signin-with-chatgpt?return_to=/profile"
                target="_top"
              >
                <LogIn size={18} /> Войти с ChatGPT
              </a>
            )}
          </div>
        </SidebarContent>
      </Sidebar>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <SidebarTrigger />
            <Link href="/">Bailanysta</Link>
          </div>
          <span className="topbar-label">Школы. Люди. Открытия.</span>
          <div className="topbar-right">
            <span className="connection-label">На связи со своими</span>
            <Link
              href="/notifications"
              className="icon-button"
              aria-label="Уведомления"
            >
              <Bell size={20} />
            </Link>
            <Link href="/profile" aria-label="Мой профиль">
              <Avatar name={user?.name || "Гость"} size="small" />
            </Link>
          </div>
        </header>
        {error && (
          <div role="alert" className="global-error">
            {error} <button onClick={() => void refresh()}>Повторить</button>
          </div>
        )}
        <main id="main-content">{children}</main>
        <footer className="page-footer">
          Bailanysta <span>Связи, с которых всё начинается.</span>
        </footer>
      </div>
    </SidebarProvider>
  );
}
