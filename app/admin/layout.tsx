"use client";

import { useState } from "react";
import AdminNavbar from "@/components/AdminNavbar";
import AdminSidebar from "@/components/AdminSidebar";
import { CurriculumProvider } from "@/lib/curriculum/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CurriculumProvider>
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        <AdminNavbar onMenuClick={() => setMobileOpen(true)} />
        <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)}>
          {children}
        </AdminSidebar>
      </div>
    </CurriculumProvider>
  );
}
