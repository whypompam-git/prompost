"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Save, Upload, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { getClient, setClientBrandImages, updateClientRow, uploadClientBrandImage } from "@/lib/supabase/queries";
import type { Client } from "@/lib/types";

export default function ClientBrandPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getClient(params.id)
      .then((c) => {
        if (!c) {
          setNotFound(true);
          return;
        }
        setClient(c);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSaveText() {
    if (!client) return;
    setSaving(true);
    try {
      await updateClientRow(client.id, client);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!client || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadClientBrandImage));
      const nextImages = [...client.brandImages, ...urls];
      setClient({ ...client, brandImages: nextImages });
      await setClientBrandImages(client.id, nextImages);
    } catch (err) {
      console.error(err);
      window.alert("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveImage(url: string) {
    if (!client) return;
    const nextImages = client.brandImages.filter((u) => u !== url);
    setClient({ ...client, brandImages: nextImages });
    try {
      await setClientBrandImages(client.id, nextImages);
    } catch (err) {
      console.error(err);
      setClient((prev) => (prev ? { ...prev, brandImages: [...prev.brandImages, url] } : prev));
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar back="/clients" title="ลูกค้า" subtitle="" />
        <LoadingView />
      </>
    );
  }

  if (notFound || !client) {
    return (
      <>
        <Topbar back="/clients" title="ไม่พบลูกค้ารายนี้" subtitle="" />
        <div className="p-6">
          <button onClick={() => router.push("/clients")} className="text-sm text-brand-600 hover:underline">
            &larr; กลับไปหน้าลูกค้า
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar back="/clients" title={client.name} subtitle="แบรนด์บรีฟ" />
      <ClientSubNav clientId={client.id} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">บรีฟแบรนด์ (ข้อความ)</label>
            <button
              onClick={handleSaveText}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-40"
            >
              <Save size={13} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
          <textarea
            value={client.brandBrief ?? ""}
            onChange={(e) => setClient({ ...client, brandBrief: e.target.value })}
            rows={6}
            placeholder="โทนแบรนด์ สี ฟอนต์ มู้ด สิ่งที่ลูกค้าชอบ/ไม่ชอบ ฯลฯ"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <ImageIcon size={15} />
              ภาพอ้างอิง ({client.brandImages.length})
            </h2>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <Upload size={13} />
              {uploading ? "กำลังอัปโหลด..." : "อัปโหลดภาพ"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>
          {client.brandImages.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
              ยังไม่มีภาพ — กด &quot;อัปโหลดภาพ&quot; เลือกได้หลายไฟล์พร้อมกัน
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {client.brandImages.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(url)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="ลบภาพ"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
