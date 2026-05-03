import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCourses } from "@/data/mock";
import { BookOpen } from "lucide-react";

export default function MyCourses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis cursos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockCourses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{course.name}</p>
                <p className="text-xs text-muted-foreground">{course.schedule}</p>
              </div>
            </div>
            <Badge variant="outline">{course.students} alumnos</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
