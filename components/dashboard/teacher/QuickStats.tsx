import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardCheck, CalendarDays } from "lucide-react";

const stats = [
  { label: "Estudiantes", value: 90, icon: Users, color: "text-primary" },
  { label: "Cursos", value: 3, icon: BookOpen, color: "text-secondary" },
  { label: "Evaluaciones", value: 12, icon: ClipboardCheck, color: "text-accent" },
  { label: "Clases hoy", value: 4, icon: CalendarDays, color: "text-muted-foreground" },
];

export default function QuickStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
