"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadClientBrandImage } from "@/lib/supabase/queries";
import type { AgencySettings } from "@/lib/types";

// Crop transparent / near-white margins so the signature fills its frame
// instead of floating in padding. Falls back to the original file on failure.
async function trimSignature(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const ink = data[i + 3] > 20 && (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235);
        if (ink) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return file;
    const pad = 4;
    minX = Math.max(minX - pad, 0);
    minY = Math.max(minY - pad, 0);
    maxX = Math.min(maxX + pad, width - 1);
    maxY = Math.min(maxY + pad, height - 1);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
    return blob ? new File([blob], "signature.png", { type: "image/png" }) : file;
  } catch {
    return file;
  }
}

export function AgencySettingsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: AgencySettings;
  onClose: () => void;
  onSave: (values: AgencySettings) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [taxId, setTaxId] = useState(initial.taxId);
  const [bankInfo, setBankInfo] = useState(initial.bankInfo);
  const [signatureUrl, setSignatureUrl] = useState(initial.signatureUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const sigRef = useRef<HTMLInputElement>(null);

  async function handleSignature(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setSignatureUrl(await uploadClientBrandImage(await trimSignature(file)));
    } catch (err) {
      console.error(err);
      window.alert("อัปโหลดลายเซ็นไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
      if (sigRef.current) sigRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">ข้อมูลผู้เสนอราคา (แสดงบนเอกสาร)</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อ</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ที่อยู่</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เบอร์โทร</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เลขประจำตัวผู้เสียภาษี</span>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">บัญชีธนาคาร (ค่าเริ่มต้นในเอกสาร)</span>
            <textarea
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">ลายเซ็นดิจิทัล (แสดงเหนือเส้นผู้เสนอราคา)</span>
            {signatureUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureUrl} alt="" className="h-14 max-w-[55%] object-contain" />
                <div className="flex flex-col items-start gap-1">
                  <button type="button" onClick={() => sigRef.current?.click()} className="text-xs font-medium text-brand-600 hover:underline">
                    {uploading ? "กำลังอัปโหลด..." : "เปลี่ยนรูป"}
                  </button>
                  <button type="button" onClick={() => setSignatureUrl("")} className="text-xs font-medium text-rose-500 hover:underline">
                    เอาออก
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => sigRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50"
              >
                <ImagePlus size={16} />
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดลายเซ็น (แนะนำ PNG พื้นใส)"}
              </button>
            )}
            <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={handleSignature} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={() => onSave({ name, address, phone, taxId, bankInfo, signatureUrl: signatureUrl || undefined })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
