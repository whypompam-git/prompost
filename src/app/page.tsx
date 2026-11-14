import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Phones open on the new clients grid; computers keep the dashboard.
export default function RootPage() {
  const ua = headers().get("user-agent") ?? "";
  redirect(/Mobi|Android|iPhone|iPod/i.test(ua) ? "/v2/clients" : "/dashboard");
}
