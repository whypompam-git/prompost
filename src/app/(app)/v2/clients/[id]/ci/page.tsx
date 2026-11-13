"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { emptyCi, getClientCi, saveClientCi, uploadClientBrandImage, type ClientCi } from "@/lib/supabase/queries";
import { useV2Client } from "../useV2Client";

const field = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const HEX = /^#?[0-9a-f]{6}$/i;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// New UI: the client's CI brand sheet — what an editor needs to match the brand
// (logo, colours, fonts, subtitle style, don'ts, files). A first skeleton; the
// details will be refined later.
export default function V2ClientCi() {
  const auth = useAuth();
  const { id, client } = useV2Client();
  const [ci, setCi] = useState<ClientCi | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getClientCi(id).then(setCi).catch(() => setCi(emptyCi(id)));
  }, [id]);

  if (!ci) return (<><Topbar back={`/v2/clients/${id}`} title="CI Brand" /><LoadingView /></>);

  const patch = (p: Partial<ClientCi>) => {
    setCi({ ...ci, ...p });
    setSaved(false);
  };

  async function save() {
    if (!ci) return;
    setSaving(true);
    try {
      await saveClientCi(ci, auth.staffId);
      setSaved(true);
    } catch (err) {
      window.alert(`บันทึกไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      patch({ logoUrl: await uploadClientBrandImage(file) });
    } catch {
      window.alert("อัปโหลดโลโก้ไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  return (
    <>
      <Topbar back={`/v2/clients/${id}`} title="CI Brand" subtitle={client?.name} />
      <div className="flex-1 space-y-4 p-4 pb-28 sm:p-6">
        <Section title="โลโก้" hint="ใช้เป็นไอคอนของลูกค้าในหน้ารายชื่อด้วย">
          <div className="flex items-center gap-3">
            <span className="block h-20 w-20 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ci.logoUrl && <img src={ci.logoUrl} alt="" className="h-full w-full object-cover" />}
            </span>
            <button onClick={() => logoRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <ImagePlus size={15} /> {uploading ? "กำลังอัปโหลด…" : ci.logoUrl ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
            </button>
            {ci.logoUrl && (
              <button onClick={() => patch({ logoUrl: "" })} className="text-xs text-rose-500 hover:underline">
                เอาออก
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
          </div>
        </Section>

        <Section title="สีแบรนด์" hint="แตะช่องสีเพื่อเลือกจากพาเลท (ลาก/RGB) หรือพิมพ์รหัส เช่น #F97316">
          <div className="space-y-2">
            {ci.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                {/* tap the swatch for the colour picker (drag / RGB), or type the code beside it */}
                <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200" style={{ background: HEX.test(c.hex) ? (c.hex.startsWith("#") ? c.hex : `#${c.hex}`) : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} title="เลือกสี">
                  <input
                    type="color"
                    value={HEX.test(c.hex) ? (c.hex.startsWith("#") ? c.hex : `#${c.hex}`).toLowerCase() : "#f97316"}
                    onChange={(e) => patch({ colors: ci.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)) })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="เลือกสีจากพาเลท"
                  />
                </label>
                <input value={c.name} onChange={(e) => patch({ colors: ci.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="ชื่อสี" className={field} />
                <input value={c.hex} onChange={(e) => patch({ colors: ci.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} placeholder="#000000" className={`${field} w-32 font-mono`} />
                <button onClick={() => patch({ colors: ci.colors.filter((_, j) => j !== i) })} className="rounded-full p-1.5 text-gray-400 hover:text-rose-600" aria-label="ลบสี">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => patch({ colors: [...ci.colors, { name: "", hex: "#F97316" }] })} className="flex items-center gap-1 text-sm font-medium text-brand-600">
              <Plus size={14} /> เพิ่มสี
            </button>
          </div>
        </Section>

        <Section title="ฟอนต์" hint="ชื่อฟอนต์ + ใช้กับอะไร เช่น หัวข้อ / ซับไตเติล">
          <div className="space-y-2">
            {ci.fonts.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={f.name} onChange={(e) => patch({ fonts: ci.fonts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="ชื่อฟอนต์" className={field} />
                <input value={f.use} onChange={(e) => patch({ fonts: ci.fonts.map((x, j) => (j === i ? { ...x, use: e.target.value } : x)) })} placeholder="ใช้กับ" className={field} />
                <button onClick={() => patch({ fonts: ci.fonts.filter((_, j) => j !== i) })} className="rounded-full p-1.5 text-gray-400 hover:text-rose-600" aria-label="ลบฟอนต์">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => patch({ fonts: [...ci.fonts, { name: "", use: "" }] })} className="flex items-center gap-1 text-sm font-medium text-brand-600">
              <Plus size={14} /> เพิ่มฟอนต์
            </button>
          </div>
        </Section>

        <Section title="สไตล์ซับไตเติล / กราฟิก" hint="ตำแหน่ง ขนาด สี ขอบ อีโมจิ เอฟเฟกต์ที่ใช้ประจำ">
          <textarea value={ci.subtitleStyle} onChange={(e) => patch({ subtitleStyle: e.target.value })} rows={3} className={field} />
        </Section>

        <Section title="สิ่งที่ห้ามทำ" hint="เช่น ห้ามใช้สีแดง ห้ามใส่เพลงแนวนี้ ห้ามตัดภาพเร็ว">
          <textarea value={ci.dont} onChange={(e) => patch({ dont: e.target.value })} rows={3} className={field} />
        </Section>

        <Section title="ไฟล์และลิงก์" hint="โลโก้ไฟล์จริง ฟอนต์ เทมเพลต ตัวอย่างงานที่ชอบ (ลิงก์ Drive)">
          <div className="space-y-2">
            {ci.files.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={f.label} onChange={(e) => patch({ files: ci.files.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="ชื่อ" className={`${field} w-40`} />
                <input value={f.url} onChange={(e) => patch({ files: ci.files.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="https://" className={field} />
                <button onClick={() => patch({ files: ci.files.filter((_, j) => j !== i) })} className="rounded-full p-1.5 text-gray-400 hover:text-rose-600" aria-label="ลบลิงก์">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => patch({ files: [...ci.files, { label: "", url: "" }] })} className="flex items-center gap-1 text-sm font-medium text-brand-600">
              <Plus size={14} /> เพิ่มลิงก์
            </button>
          </div>
        </Section>

        <Section title="โน้ตเพิ่มเติมสำหรับ Editor">
          <textarea value={ci.notes} onChange={(e) => patch({ notes: e.target.value })} rows={4} className={field} />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-auto md:right-6 md:w-auto md:rounded-t-xl md:border">
        <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 md:w-auto">
          <Save size={15} /> {saving ? "กำลังบันทึก…" : saved ? "บันทึกแล้ว" : "บันทึก CI Brand"}
        </button>
      </div>
    </>
  );
}
