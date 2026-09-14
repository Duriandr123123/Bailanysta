import { api } from "@/lib/api";
export const dynamic = "force-dynamic";
async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return api(req, (await params).path);
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
