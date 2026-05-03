import Navbar from "@/components/layout/Navbar";
import SidebarFather from "@/components/layout/SidebarFather";

export default function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <SidebarFather />
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
