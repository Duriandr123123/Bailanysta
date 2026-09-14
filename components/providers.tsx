"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Person, School } from "@/lib/types";
export async function request<T = any>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch("/api/" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data: any = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}
export const mutate = (path: string, body: unknown = {}, method = "POST") =>
  request(path, { method, body: JSON.stringify(body) });
const Context = createContext<{
  user: Person | null;
  schools: School[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}>({
  user: null,
  schools: [],
  loading: true,
  error: "",
  refresh: async () => {},
});
export const useApp = () => useContext(Context);
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Person | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const session = await request("session");
      setUser(session.user);
      setSchools(await request("schools"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Context.Provider value={{ user, schools, loading, error, refresh }}>
        {children}
        <Toaster richColors position="bottom-right" />
      </Context.Provider>
    </ThemeProvider>
  );
}
