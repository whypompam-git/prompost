import Image from "next/image";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";

// Top of the client link: the client's own logo (when we have it) and the page title.
export function PortalHeader({ title, logo, subtitle }: { title: string; logo?: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-card" />
      ) : (
        <Image src={APP_LOGO_SRC} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow-card" priority />
      )}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-600">{subtitle ?? APP_NAME}</p>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
}
