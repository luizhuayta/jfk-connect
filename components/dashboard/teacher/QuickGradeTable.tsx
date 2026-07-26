import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const grades = [
  { id: "1", student: "Ana Pérez", course: "Matemáticas", grade: 18 },
  { id: "2", student: "Luis García", course: "Matemáticas", grade: 15 },
  { id: "3", student: "María López", course: "Ciencias", grade: 12 },
  { id: "4", student: "Pedro Ruiz", course: "Historia", grade: 19 },
];

export default function QuickGradeTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimas calificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead className="text-right">Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.student}</TableCell>
                <TableCell>{g.course}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={g.grade >= 13 ? "default" : "destructive"}>
                    {g.grade}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
