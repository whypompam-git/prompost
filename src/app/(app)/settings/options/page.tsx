"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import { COLOR_STEMS, PALETTE, pillClass } from "@/lib/colors";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTaskSettings, saveTaskSettings } from "@/lib/supabase/queries";
import { STATUS_KEYS } from "@/lib/taskSettings";
import { publishTaskSettings } from "@/lib/useTaskSettings";
import type { TaskSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

function Swatches({ value, onChange }: { value: string; onChange: (stem: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_STEMS.map((stem) => (
        <button
          key={stem}
          type="button"
          onClick={() => onChange(stem)}
          aria-label={PALETTE[stem].label}
          title={PALETTE[stem].label}
          className={cn(
            "h-6 w-6 rounded-full",
            PALETTE[stem].solid,
            value === stem && "ring-2 ring-gray-900 ring-offset-2",
          )}
        />
      ))}
    </div>
  );
}

export default function TaskOptionsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [settings, setSettings] = useState<TaskSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (auth.role !== "owner") {
      router.replace("/dashboard");
      return;
    }
    getTaskSettings().then(setSettings);
  }, [auth.role, router]);

  if (auth.role !== "owner") return null;

  if (!settings) {
    return (
      <>
        <Topbar title="ตั้งค่า" subtitle="ประเภทงานและสี" />
        <SettingsTabs />
        <LoadingView />
      </>
    );
  }

  function update(patch: Partial<TaskSettings>) {
    setSaved(false);
    setSettings((s) => (s ? { ...s, ...patch } : s));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await saveTaskSettings(settings);
      publishTaskSettings(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="ประเภทงานและสี" />
      <SettingsTabs />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">ประเภทงาน</h2>
            <button
              onClick={() =>
                update({
                  types: [
                    ...settings.types,
                    { key: `t_${Date.now().toString(36)}`, label: "ประเภทใหม่", color: "pink" },
                  ],
                })
              }
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus size={15} />
              เพิ่มประเภท
            </button>
          </div>
          <Card className="space-y-4">
            {settings.types.map((t, i) => (
              <div key={t.key} className="space-y-2 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={t.label}
                    onChange={(e) =>
                      update({
                        types: settings.types.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", pillClass(t.color))}>
                    ตัวอย่าง
                  </span>
                  <button
                    onClick={() => update({ types: settings.types.filter((_, j) => j !== i) })}
                    disabled={settings.types.length <= 1}
                    className="rounded-full p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    aria-label="ลบประเภท"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <Swatches
                  value={t.color}
                  onChange={(stem) =>
                    update({ types: settings.types.map((x, j) => (j === i ? { ...x, color: stem } : x)) })
                  }
                />
              </div>
            ))}
            <p className="text-xs text-gray-400">
              ถ้าลบประเภทที่มีงานใช้อยู่ งานเหล่านั้นจะแสดงเป็นชื่อรหัสเดิมจนกว่าจะเปลี่ยนประเภท
            </p>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">สีสถานะ</h2>
          <Card className="space-y-4">
            {STATUS_KEYS.map((k) => (
              <div key={k} className="space-y-2 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{STATUS_LABEL[k]}</span>
                  <span
                    className={cn("rounded-full px-2.5 py-1 text-xs font-medium", pillClass(settings.statusColors[k]))}
                  >
                    {STATUS_LABEL[k]}
                  </span>
                </div>
                <Swatches
                  value={settings.statusColors[k]}
                  onChange={(stem) => update({ statusColors: { ...settings.statusColors, [k]: stem } })}
                />
              </div>
            ))}
          </Card>
        </section>

        <p className="text-xs text-gray-400">
          สีของลูกค้าตั้งได้ที่หน้าแก้ไขลูกค้า และสีของผู้รับผิดชอบตั้งได้ที่ ตั้งค่า → พนักงาน → แก้ไข
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          {saved && <span className="text-sm text-emerald-600">บันทึกแล้ว</span>}
        </div>
      </div>
    </>
  );
}
