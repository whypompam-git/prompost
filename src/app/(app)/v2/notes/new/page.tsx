"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { createTeamNote } from "@/lib/supabase/queries";

// "+ โน้ต": make an empty note and open it.
export default function NewNotePage() {
  const auth = useAuth();
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createTeamNote(auth.staffId)
      .then((n) => router.replace(`/v2/notes/${n.id}?fresh=1`))
      .catch((err) => {
        window.alert(`สร้างโน้ตไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
        router.replace("/v2/notes");
      });
  }, [auth.staffId, router]);
  return <LoadingView />;
}
