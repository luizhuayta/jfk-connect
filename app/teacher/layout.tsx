"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import TeacherSidebar from "@/components/TeacherSidebar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <TeacherSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      >
        {children}
      </TeacherSidebar>
    </div>
  );
}
