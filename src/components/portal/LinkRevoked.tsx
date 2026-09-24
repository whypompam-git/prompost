import Image from "next/image";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";

export function LinkRevoked() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <Image src={APP_LOGO_SRC} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" />
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
      <h1 className="mt-4 text-lg font-semibold text-gray-900">ลิงก์นี้ถูกยกเลิกแล้ว</h1>
      <p className="mt-1 text-sm text-gray-500">หากต้องการเข้าถึงอีกครั้ง กรุณาติดต่อทางร้าน</p>
    </div>
  );
}
