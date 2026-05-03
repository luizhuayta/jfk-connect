import Navbar from "@/components/layout/Navbar";
import SidebarTeacher from "@/components/layout/SidebarTeacher";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <SidebarTeacher />
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
