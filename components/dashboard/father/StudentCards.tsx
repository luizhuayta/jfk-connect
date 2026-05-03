import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockStudents } from "@/data/mock";
import { GraduationCap } from "lucide-react";

export default function StudentCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {mockStudents.map((student) => (
        <Card key={student.id}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {student.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-base">{student.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{student.grade} {student.section}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Promedio general</span>
              <span className="font-semibold">{student.average.toFixed(1)}</span>
            </div>
            <Progress value={(student.average / 20) * 100} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>12 cursos matriculados</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
