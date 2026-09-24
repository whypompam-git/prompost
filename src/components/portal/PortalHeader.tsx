import Image from "next/image";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";

export function PortalHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image src={APP_LOGO_SRC} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow-card" priority />
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
}
