import { Sidebar } from "@/components/Sidebar";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="ml-60 min-h-screen">{children}</main>
    </div>
  );
}
