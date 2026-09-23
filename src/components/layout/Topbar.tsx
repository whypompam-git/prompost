"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getProfile, type Profile } from "@/lib/profile";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [profile, setProfile] = useState<Profile>({ name: "", photo: null });

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-full p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700">
          <Bell size={18} />
        </button>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
        >
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile.name || "A").charAt(0).toUpperCase()
          )}
        </Link>
      </div>
    </header>
  );
}
