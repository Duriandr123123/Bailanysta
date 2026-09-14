import { Chats } from "@/components/chats";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Chats channelId={(await params).id} />;
}
