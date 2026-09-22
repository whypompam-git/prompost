import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { mockStaff } from "@/lib/mock-data";

export default function HrPage() {
  return (
    <>
      <Topbar title="พนักงาน" subtitle="ข้อมูลพนักงาน วันหยุด และเงินเดือน" />
      <div className="flex-1 space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockStaff.map((s) => (
            <Card key={s.id} className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${s.avatarColor}`}>
                {s.name.slice(0, 1)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">{s.position}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="text-sm text-gray-500">
          กำลังจะมา: สรุปงานที่เสร็จรายเดือน, บันทึกวันหยุด/โควต้า, และคำนวณเงินเดือน/โบนัส
        </Card>
      </div>
    </>
  );
}
