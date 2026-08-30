"use client";

import { useState } from "react";
import TeacherNavbar from "@/components/TeacherNavbar";
import TeacherSidebar from "@/components/TeacherSidebar";
import { TeacherCoursesProvider } from "@/components/teacher/useTeacherCourses";
import { CurriculumProvider } from "@/lib/curriculum/client";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";

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
          <AssistantLauncher variant="docente" />
        </div>
      </TeacherCoursesProvider>
    </CurriculumProvider>
  );
}
