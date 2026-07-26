import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, UserCheck } from "lucide-react";

const stats = [
  { label: "Estudiantes", value: 340, change: "+12%", icon: GraduationCap },
  { label: "Profesores", value: 28, change: "+2", icon: Users },
  { label: "Cursos", value: 45, change: "+3", icon: BookOpen },
  { label: "Asistencia hoy", value: "96%", change: "+1%", icon: UserCheck },
];

export default function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.change} este mes</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
