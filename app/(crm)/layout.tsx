import { Sidebar, MAIN_OFFSET_CLASS } from "@/components/Sidebar";
import { PageStickyNote } from "@/components/PageStickyNote";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className={`min-h-screen ${MAIN_OFFSET_CLASS}`}>{children}</main>
      <PageStickyNote />
    </div>
  );
}
