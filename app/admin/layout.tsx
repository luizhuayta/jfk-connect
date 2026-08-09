"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SidebarAdmin from "@/components/layout/SidebarAdmin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <SidebarAdmin mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)}>
        {children}
      </SidebarAdmin>
    </div>
  );
}
