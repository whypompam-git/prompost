"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { listStaff, updateOwnProfile } from "@/lib/supabase/queries";
import type { Staff } from "@/lib/types";

const MAX_DIMENSION = 256;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    listStaff().then((staffRows) => {
      const me = staffRows.find((s: Staff) => s.id === auth.staffId);
      if (me) {
        setName(me.name);
        setPhoto(me.photoUrl ?? null);
      }
      setLoading(false);
    });
  }, [auth.staffId]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeToDataUrl(file);
    setPhoto(dataUrl);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateOwnProfile(auth.staffId, { name: name.trim(), photoUrl: photo });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar back="/dashboard" title="โปรไฟล์" subtitle="แก้ไขชื่อและรูปโปรไฟล์ของคุณ" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar back="/dashboard" title="โปรไฟล์" subtitle="แก้ไขชื่อและรูปโปรไฟล์ของคุณ" />
      <div className="flex-1 space-y-6 p-6">
        <div className="max-w-sm space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-700"
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                (name || "A").charAt(0).toUpperCase()
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={20} />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              เปลี่ยนรูปโปรไฟล์
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อที่แสดง</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อของคุณ"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || name.trim().length === 0}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </>
  );
}
