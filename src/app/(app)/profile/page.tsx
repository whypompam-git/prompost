"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { getProfile, saveProfile, type Profile } from "@/lib/profile";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>({ name: "", photo: null });

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => ({ ...p, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    saveProfile(profile);
    router.push("/dashboard");
  }

  return (
    <>
      <Topbar title="โปรไฟล์" subtitle="แก้ไขชื่อและรูปโปรไฟล์ของคุณ" />
      <div className="flex-1 space-y-6 p-6">
        <div className="max-w-sm space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-700"
            >
              {profile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.name || "A").charAt(0).toUpperCase()
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
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="ชื่อของคุณ"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            บันทึก
          </button>
        </div>
      </div>
    </>
  );
}
