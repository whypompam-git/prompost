"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { mcPhoto, withScheme } from "@/lib/mcDisplay";
import { getMcProfile, updateMcLocal, uploadMcPhoto } from "@/lib/supabase/queries";
import type { McProfile } from "@/lib/types";

const Row = ({ label, value, link }: { label: string; value?: string; link?: boolean }) =>
  value ? (
    <div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      {link ? (
        <a href={withScheme(value)} target="_blank" rel="noreferrer" className="break-all text-sm text-brand-600 hover:underline">{value}</a>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-gray-800">{value}</p>
      )}
    </div>
  ) : null;

export default function McProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<McProfile | null | undefined>(undefined);
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMcProfile(id).then((x) => {
      setP(x);
      setRate(x?.rateOffer ? String(x.rateOffer) : "");
      setNotes(x?.notes ?? "");
    });
  }, [id]);

  async function save(values: Parameters<typeof updateMcLocal>[1], note = "บันทึกแล้ว") {
    await updateMcLocal(id, values);
    setP((prev) => (prev ? { ...prev, ...values, notes: values.notes ?? prev.notes } as McProfile : prev));
    setSaved(note);
    setTimeout(() => setSaved(""), 1800);
  }

  async function addPhotos(files: File[]) {
    if (!p) return;
    setUploading(true);
    const urls: string[] = [];
    for (const f of files.filter((x) => x.type.startsWith("image/"))) {
      try {
        urls.push(await uploadMcPhoto(f));
      } catch {
        window.alert(`อัปโหลด "${f.name}" ไม่สำเร็จ`);
      }
    }
    setUploading(false);
    if (urls.length) await save({ extraPhotos: [...p.extraPhotos, ...urls] }, "เพิ่มรูปแล้ว");
  }

  if (p === undefined) return (<><Topbar back="/mc" title="MC" subtitle="" /><LoadingView /></>);
  if (p === null) return (<><Topbar back="/mc" title="ไม่พบ MC" subtitle="" /><div className="p-6 text-sm text-gray-500">ไม่พบโปรไฟล์นี้</div></>);

  const photos = [...p.extraPhotos, ...(p.photoUrl ? [p.photoUrl] : [])];
  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <>
      <Topbar back="/mc" title={p.nickname} subtitle={[p.prefix, p.fullName].filter(Boolean).join(" ")} />
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-1">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
            {mcPhoto(p) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mcPhoto(p)} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={url} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
                {p.extraPhotos.includes(url) && (
                  <span className="absolute -right-1.5 -top-1.5 hidden gap-0.5 group-hover:flex">
                    {i > 0 && <button title="ใช้เป็นรูปหลัก" onClick={() => save({ extraPhotos: [url, ...p.extraPhotos.filter((u) => u !== url)] })} className="rounded-full bg-amber-500 p-0.5 text-white"><Star size={11} /></button>}
                    <button title="เอารูปออก" onClick={() => save({ extraPhotos: p.extraPhotos.filter((u) => u !== url) })} className="rounded-full bg-gray-800 p-0.5 text-white"><X size={11} /></button>
                  </span>
                )}
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50" aria-label="เพิ่มรูป">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </div>
          <p className="text-[11px] text-gray-400">รูปที่เพิ่มเองจะอยู่ก่อนรูปจากฟอร์ม (กดดาวบนรูปเพื่อใช้เป็นรูปหลัก)</p>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">ราคาและโน้ตภายใน (ลูกค้าไม่เห็นโน้ต)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-500">
                ราคาเสนอลูกค้า (บาท/คิว)
                <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} onBlur={() => save({ rateOffer: rate ? Number(rate) : null })} className={`${field} mt-1`} />
              </label>
              <div className="text-xs font-medium text-gray-500">
                เรทที่ MC กรอกในฟอร์ม (ภายใน)
                <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{p.sheetRate ?? "—"}</p>
              </div>
            </div>
            <label className="block text-xs font-medium text-gray-500">
              โน้ตภายใน
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (p.notes ?? "") && save({ notes })} rows={3} className={`${field} mt-1`} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={p.hidden} onChange={(e) => save({ hidden: e.target.checked })} />
              ซ่อนจากรายการ MC (ไม่ลบข้อมูล)
            </label>
            {saved && <p className="text-xs text-emerald-600">{saved}</p>}
          </Card>

          <Card className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <h2 className="text-sm font-semibold text-gray-700 sm:col-span-2">ข้อมูลจากชีต (แก้ที่ชีต แล้วกดอัปเดตจากชีต)</h2>
            <Row label="อายุ" value={p.age} />
            <Row label="ส่วนสูง" value={p.height} />
            <Row label="น้ำหนัก" value={p.weight} />
            <Row label="เบอร์โทร (ภายใน)" value={p.phone} />
            <Row label="Line ID (ภายใน)" value={p.lineId} />
            <Row label="Instagram" value={p.ig} link />
            <Row label="Facebook" value={p.facebook} link />
            <Row label="ลิงก์ผลงาน" value={p.portfolio} link />
            <div className="sm:col-span-2"><Row label="คาแรคเตอร์ / สไตล์" value={p.character} /></div>
            <div className="sm:col-span-2"><Row label="ความสามารถพิเศษ" value={p.skills} /></div>
            <div className="sm:col-span-2"><Row label="ประสบการณ์" value={p.experience} /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
