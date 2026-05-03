import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockNotes } from "@/data/mock";

export default function RecentNotes() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calificaciones recientes</CardTitle>
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
            {mockNotes.map((note) => (
              <TableRow key={note.id}>
                <TableCell className="font-medium">{note.studentName}</TableCell>
                <TableCell>{note.course}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={note.value >= 13 ? "default" : "destructive"}>
                    {note.value}
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
