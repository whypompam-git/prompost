"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";
import Image from "next/image";

type StaffOption = {
  id: string;
  name: string;
  avatarColor: string;
  position: string;
  photoUrl?: string;
};

function Avatar({ s, size }: { s: StaffOption; size: "sm" | "lg" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${s.avatarColor} ${
        size === "lg" ? "h-14 w-14 text-lg" : "h-14 w-14 text-lg"
      }`}
    >
      {s.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        s.name.charAt(0)
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffOption | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/staff-list")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (pin.length === 4 && selected) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: selected.id, pin }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("PIN ไม่ถูกต้อง");
      setPin("");
      setSubmitting(false);
    }
  }

  function press(digit: string) {
    if (pin.length >= 4 || submitting) return;
    setError("");
    setPin((p) => p + digit);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={APP_LOGO_SRC} alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
        <h1 className="text-lg font-semibold text-gray-900">{APP_NAME}</h1>
      </div>

      {!selected ? (
        <div className="w-full max-w-sm">
          <p className="mb-4 text-center text-sm text-gray-500">เลือกบัญชีของคุณเพื่อเข้าใช้งาน</p>
          {loading && <p className="text-center text-sm text-gray-400">กำลังโหลด...</p>}
          <div className="grid grid-cols-3 gap-4">
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="flex flex-col items-center gap-2 rounded-xl p-3 text-center hover:bg-white"
              >
                <Avatar s={s} size="sm" />
                <span className="line-clamp-2 text-xs font-medium text-gray-700">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar s={selected} size="lg" />
            <p className="text-sm font-medium text-gray-800">{selected.name}</p>
            <button
              onClick={() => {
                setSelected(null);
                setPin("");
                setError("");
              }}
              className="text-xs text-brand-600 hover:underline"
            >
              ไม่ใช่คุณ? เปลี่ยนบัญชี
            </button>
          </div>

          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  pin.length > i ? "border-brand-500 bg-brand-500" : "border-gray-300"
                }`}
              />
            ))}
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-800 shadow-card hover:bg-gray-100"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => press("0")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-800 shadow-card hover:bg-gray-100"
            >
              0
            </button>
            <button
              onClick={backspace}
              className="flex h-14 w-14 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="ลบ"
            >
              <Delete size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
