"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { flushTaskEditQueue, pendingTaskEditCount } from "@/lib/offline/queue";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(pendingTaskEditCount());

    async function sync() {
      setSyncing(true);
      await flushTaskEditQueue();
      setPending(pendingTaskEditCount());
      setSyncing(false);
    }

    function handleOnline() {
      setOnline(true);
      sync();
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-white ${
        online ? "bg-amber-500" : "bg-gray-700"
      }`}
    >
      {online ? (
        <>
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
          กำลังซิงค์ {pending} รายการที่บันทึกไว้ตอนออฟไลน์...
        </>
      ) : (
        <>
          <WifiOff size={12} />
          ออฟไลน์ — ข้อมูลที่เห็นอาจไม่ล่าสุด การแก้ไขจะซิงค์อัตโนมัติเมื่อมีเน็ต
        </>
      )}
    </div>
  );
}
