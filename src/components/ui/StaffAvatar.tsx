import type { Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StaffAvatar({
  staff,
  className,
}: {
  staff: Pick<Staff, "name" | "avatarColor" | "photoUrl">;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white",
        staff.avatarColor,
        className,
      )}
    >
      {staff.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={staff.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        staff.name.slice(0, 1)
      )}
    </div>
  );
}
