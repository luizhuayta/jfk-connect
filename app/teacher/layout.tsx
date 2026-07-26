import TeacherSidebar from "@/components/TeacherSidebar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <TeacherSidebar>{children}</TeacherSidebar>;
}
