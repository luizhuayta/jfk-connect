import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const classes = [
  { id: "1", name: "Matemáticas", time: "08:00 - 09:30", room: "A-101", status: "next" },
  { id: "2", name: "Ciencias", time: "10:00 - 11:30", room: "B-202", status: "later" },
  { id: "3", name: "Historia", time: "14:00 - 15:30", room: "C-303", status: "later" },
];

export default function UpcomingClasses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximas clases</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {classes.map((cls) => (
          <div key={cls.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{cls.name}</p>
                <p className="text-xs text-muted-foreground">{cls.time} · {cls.room}</p>
              </div>
            </div>
            <Badge variant={cls.status === "next" ? "default" : "outline"}>
              {cls.status === "next" ? "Próxima" : "Más tarde"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
