import { Sidebar, Topbar } from "@/components/layout/Sidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-64">
        <Topbar />
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
