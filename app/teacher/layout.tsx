"use client";

import { useState } from "react";
import TeacherNavbar from "@/components/TeacherNavbar";
import TeacherSidebar from "@/components/TeacherSidebar";
import { TeacherCoursesProvider } from "@/components/teacher/useTeacherCourses";
import { CurriculumProvider } from "@/lib/curriculum/client";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CurriculumProvider>
      <TeacherCoursesProvider>
        <div className="min-h-screen bg-[#F8FAFC]">
          <TeacherNavbar onMenuClick={() => setMobileOpen(true)} />
          <TeacherSidebar
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          >
            {children}
          </TeacherSidebar>
        </div>
      </TeacherCoursesProvider>
    </CurriculumProvider>
  );
}
