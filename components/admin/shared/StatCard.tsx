import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  bg,
  text,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  bg: string;
  text: string;
}) {
  return (
    <Card className="border-none shadow-sm rounded-xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${bg} shrink-0`}>
          <Icon className={`h-5 w-5 ${text}`} aria-hidden />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{children}</div>;
}
