"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight, Film, LogOut, Menu, Pencil, Users, X } from "lucide-react";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientTile } from "@/components/v2/AppGrid";
import { LEGACY_ITEMS, allowed } from "@/components/layout/navItems";
import { useAuth } from "@/lib/auth/AuthContext";
import { listClientLogos, listClients, listStaff, listTasksLite, updateOwnProfile } from "@/lib/supabase/queries";
import type { Client, Staff, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DriveGrid } from "@/components/portal/DriveGrid";
import { GoalCard } from "@/components/my/GoalCard";

const MAX = 256;
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const s = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * s;
        c.height = img.height * s;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DONE = new Set(["approved", "posted"]);

// New UI: my profile, like an Instagram profile — photo, counts, the clients I look
// after and a grid of the work I finished. The old menu sits behind ☰ (top right).
export default function V2MePage() {
  const auth = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Staff | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"work" | "clients">("work");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listStaff(), listTasksLite(), listClients(), listClientLogos().catch(() => ({}) as Record<string, string>)])
      .then(([s, t, c, l]) => {
        setMe(s.find((x) => x.id === auth.staffId) ?? null);
        setTasks(t);
        setClients(c);
        setLogos(l);
      })
      .finally(() => setLoading(false));
  }, [auth.staffId]);

  const mineDone = useMemo(
    () =>
      tasks
        .filter((t) => DONE.has(t.type) && (t.editorId === auth.staffId || t.shotById === auth.staffId || t.assigneeId === auth.staffId))
        .sort((a, b) => (b.postDate ?? b.editDate ?? "").localeCompare(a.postDate ?? a.editDate ?? "")),
    [tasks, auth.staffId],
  );
  const myClients = useMemo(() => clients.filter((c) => c.managerId === auth.staffId), [clients, auth.staffId]);
  const inProgress = useMemo(
    () => tasks.filter((t) => ["shoot", "edit", "qc"].includes(t.type) && (t.editorId === auth.staffId || t.shotById === auth.staffId || t.assigneeId === auth.staffId)).length,
    [tasks, auth.staffId],
  );
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
  const menu = LEGACY_ITEMS.filter((i) => allowed(i, auth));

  async function changePhoto(file?: File) {
    if (!file || !me) return;
    setBusy(true);
    try {
      const photoUrl = await resizeToDataUrl(file);
      await updateOwnProfile(me.id, { name: me.name, photoUrl });
      setMe({ ...me, photoUrl });
    } catch {
      window.alert("เปลี่ยนรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) return <LoadingView />;

  return (
    <div className="flex-1 pb-6">
      {/* header: name + ☰ */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
        <h1 className="truncate text-lg font-semibold text-gray-900">{me?.name ?? "โปรไฟล์"}</h1>
        <button onClick={() => setMenuOpen(true)} className="rounded-full p-2 text-gray-700 hover:bg-gray-100" aria-label="เมนูอื่นๆ">
          <Menu size={22} />
        </button>
      </div>

      {/* avatar + counts */}
      <div className="flex items-center gap-5 px-4 sm:px-6">
        <button onClick={() => fileRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-700" aria-label="เปลี่ยนรูป">
          {me?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{(me?.name ?? "?").charAt(0)}</span>
          )}
          <span className={cn("absolute inset-0 flex items-center justify-center bg-black/40 text-white transition", busy ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            <Camera size={18} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
        <div className="grid flex-1 grid-cols-3 text-center">
          {[
            [mineDone.length, "งานที่เสร็จ"],
            [inProgress, "กำลังทำ"],
            [myClients.length, "ลูกค้าที่ดูแล"],
          ].map(([n, label]) => (
            <div key={label as string}>
              <p className="text-lg font-semibold tabular-nums text-gray-900">{n}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 sm:px-6">
        <p className="text-sm text-gray-600">{me?.position || " "}</p>
        <Link href="/profile" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
          <Pencil size={14} /> แก้ไขโปรไฟล์
        </Link>
        <div className="mt-3">
          <GoalCard />
          {auth.role === "owner" && (
            <Link href="/v2/progress" className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-brand-600">
              Progress Tracking ของทั้งทีม · ตั้งเป้าให้พนักงาน <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 grid grid-cols-2 border-b border-gray-200">
        {([["work", "งานที่ทำ", Film], ["clients", "ลูกค้าที่ดูแล", Users]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-medium", tab === k ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "work" ? (
        mineDone.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">ยังไม่มีงานที่เสร็จ</p>
        ) : (
          <DriveGrid clips={mineDone.map((t) => ({ id: t.id, title: t.title, subtitle: clientName(t.clientId), finalUrl: t.finalUrl ?? null, coverUrl: t.coverUrl ?? null }))} />
        )
      ) : myClients.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">ยังไม่มีลูกค้าที่คุณเป็นผู้ดูแล</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-5 sm:p-6">
          {myClients.map((c) => (
            <ClientTile key={c.id} href={`/v2/clients/${c.id}`} name={c.name} logo={logos[c.id] || c.brandImages?.[0]} color={c.colorTag} />
          ))}
        </div>
      )}

      {/* ☰ other menus */}
      {menuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-2xl md:inset-x-auto md:right-6 md:top-16 md:bottom-auto md:w-80 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">เมนูอื่นๆ</span>
              <button onClick={() => setMenuOpen(false)} className="rounded-full p-1 text-gray-400" aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 px-1 py-3 text-sm text-gray-700">
                    <Icon size={18} className="text-gray-400" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                );
              })}
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                  router.refresh();
                }}
                className="flex w-full items-center gap-3 px-1 py-3 text-sm text-rose-600"
              >
                <LogOut size={18} /> ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
