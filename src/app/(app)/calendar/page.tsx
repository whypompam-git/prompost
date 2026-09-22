import { Topbar } from "@/components/layout/Topbar";
import { CalendarMatrix } from "@/components/calendar/CalendarMatrix";
import { mockClients, mockStaff, mockTasks } from "@/lib/mock-data";

export default function CalendarPage() {
  return (
    <>
      <Topbar title="ปฏิทินงาน" subtitle="คิวงานของแต่ละลูกค้าตลอดทั้งเดือน" />
      <div className="flex-1 p-6">
        <CalendarMatrix tasks={mockTasks} clients={mockClients} staff={mockStaff} />
      </div>
    </>
  );
}
