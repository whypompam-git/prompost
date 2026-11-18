import { redirect } from "next/navigation";

export default function LegacyPortalPage({ params }: { params: { token: string } }) {
  redirect(`/portal/${params.token}/review`);
}
