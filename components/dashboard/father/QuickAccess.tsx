import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, CalendarDays, FileText } from "lucide-react";

const items = [
  { label: "Boletín", icon: FileText, href: "#" },
  { label: "Asistencia", icon: ClipboardList, href: "#" },
  { label: "Horario", icon: CalendarDays, href: "#" },
  { label: "Cursos", icon: BookOpen, href: "#" },
];

export default function QuickAccess() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 mb-2">
              <item.icon className="h-5 w-5 text-primary" />
            </Button>
            <span className="text-xs font-medium">{item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
