import { Profile } from "@/components/profile";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Profile publicId={(await params).id} />;
}
