import FatherSidebar from "@/components/FatherSidebar";

export default function FatherLayout({ children }: { children: React.ReactNode }) {
  return <FatherSidebar>{children}</FatherSidebar>;
}
