"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Clock, MapPin } from "lucide-react";

const stats = [
  { label: "Mis Cursos", value: "3", badge: null },
  { label: "Total Alumnos", value: "92", badge: null },
  { label: "Promedio General", value: "14.8", badge: "Excelente" },
  { label: "Asistencia Promedio", value: "96%", badge: "Optimo" },
];

const courses = [
  { id: 1, name: "Matematica", section: "1° A", students: 32 },
  { id: 2, name: "Lengua Castellana", section: "2° B", students: 30 },
  { id: 3, name: "Historia", section: "3° C", students: 30 },
];

interface StudentGrade {
  id: string;
  name: string;
  initials: string;
  n1: number;
  n2: number;
  n3: number;
  observation: string;
}

const initialGrades: StudentGrade[] = [
  { id: "1", name: "Carlos Mendoza", initials: "CM", n1: 16, n2: 17, n3: 18, observation: "Excelente desempeno" },
  { id: "2", name: "Maria Garcia", initials: "MG", n1: 14, n2: 15, n3: 14, observation: "Buen alumno" },
  { id: "3", name: "Pedro Lopez", initials: "PL", n1: 12, n2: 13, n3: 12, observation: "Necesita refuerzo" },
  { id: "4", name: "Ana Rodriguez", initials: "AR", n1: 18, n2: 17, n3: 19, observation: "Desempeno sobresaliente" },
];

const upcomingClasses = [
  { id: 1, name: "Matematica", section: "1° A", room: "Aula 101", time: "09:00 - 10:00", badge: "Hoy", highlighted: false },
  { id: 2, name: "Matematica", section: "1° B", room: "Aula 102", time: "10:15 - 11:15", badge: "Hoy", highlighted: true },
  { id: 3, name: "Lengua Castellana", section: "2° A", room: "Aula 201", time: "08:00 - 09:00", badge: "Manana", highlighted: false },
  { id: 4, name: "Historia", section: "3° C", room: "Aula 305", time: "14:00 - 15:00", badge: "Manana", highlighted: false },
];

const recentActivity = [
  { id: 1, time: "Hace 2 horas", text: "Calificaste a 1° A en Matematica" },
  { id: 2, time: "Hace 4 horas", text: "Registraste asistencia en 2° B" },
  { id: 3, time: "Ayer", text: "Publicaste material: \"Cap. 5 Historia\"" },
  { id: 4, time: "Ayer", text: "Nuevo aviso del director" },
];

export default function TeacherDashboard() {
  const [grades, setGrades] = useState<StudentGrade[]>(initialGrades);
  const [selectedCourse, setSelectedCourse] = useState("matematica-1a");

  const updateGrade = (id: string, field: keyof StudentGrade, value: string) => {
    setGrades((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (field === "observation") return { ...s, observation: value };
        const num = parseFloat(value) || 0;
        const updated = { ...s, [field]: num } as StudentGrade;
        const avg = ((updated.n1 + updated.n2 + updated.n3) / 3).toFixed(1);
        return { ...updated, avg };
      })
    );
  };

  const average = (n1: number, n2: number, n3: number) =>
    ((n1 + n2 + n3) / 3).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-[#0F172A]">
          Bienvenido, Prof. Juan Perez
        </h1>
        <p className="text-muted-foreground mt-2">
          Domingo, 3 de mayo de 2026
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-none shadow-sm rounded-xl"
          >
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-3">{stat.label}</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[#0F172A]">
                  {stat.value}
                </span>
                {stat.badge && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-medium text-xs">
                    {stat.badge}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mis Cursos Actuales */}
      <section>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">
          Mis Cursos Actuales
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
            >
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {course.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Seccion: {course.section}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {course.students} estudiantes
                  </p>
                </div>
                <Button className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg h-10">
                  Gestionar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Registrar Notas Rapido */}
      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0F172A]">
            Registrar Notas Rapido
          </h2>

          <div className="space-y-2 max-w-xs">
            <label className="text-sm text-muted-foreground">
              Seleccionar Curso/Seccion
            </label>
            <Select value={selectedCourse} onValueChange={(v) => setSelectedCourse(v ?? "")}>
              <SelectTrigger className="rounded-lg border-gray-200">
                <SelectValue placeholder="Seleccionar curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matematica-1a">Matematica - 1° A</SelectItem>
                <SelectItem value="lengua-2b">Lengua Castellana - 2° B</SelectItem>
                <SelectItem value="historia-3c">Historia - 3° C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm">
                    Alumno
                  </TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm text-center">
                    Nota 1
                  </TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm text-center">
                    Nota 2
                  </TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm text-center">
                    Nota 3
                  </TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm text-center">
                    Promedio
                  </TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">
                    Observacion
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((student) => (
                  <TableRow key={student.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#2563EB] text-white text-xs font-bold">
                            {student.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-[#0F172A]">
                          {student.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={student.n1}
                        onChange={(e) =>
                          updateGrade(student.id, "n1", e.target.value)
                        }
                        className="w-16 h-8 text-center text-sm mx-auto rounded-md border-gray-200"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={student.n2}
                        onChange={(e) =>
                          updateGrade(student.id, "n2", e.target.value)
                        }
                        className="w-16 h-8 text-center text-sm mx-auto rounded-md border-gray-200"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={student.n3}
                        onChange={(e) =>
                          updateGrade(student.id, "n3", e.target.value)
                        }
                        className="w-16 h-8 text-center text-sm mx-auto rounded-md border-gray-200"
                      />
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold text-[#0F172A]">
                      {average(student.n1, student.n2, student.n3)}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={student.observation}
                        onChange={(e) =>
                          updateGrade(student.id, "observation", e.target.value)
                        }
                        className="h-8 text-sm rounded-md border-gray-200"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 transition-colors">
            Guardar Todas las Notas
          </Button>
        </CardContent>
      </Card>

      {/* Proximas Clases + Actividad Reciente */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Proximas Clases */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#1E2A5E]" />
              Proximas Clases
            </h2>
            <div className="space-y-3">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    cls.highlighted ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${
                          cls.badge === "Hoy"
                            ? "border-blue-200 text-blue-600 bg-blue-50"
                            : "border-gray-200 text-gray-600 bg-gray-50"
                        }`}
                      >
                        {cls.badge === "Manana" ? "Manana" : cls.badge}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Seccion {cls.section}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-red-400" />
                      {cls.room}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    {cls.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Actividad Reciente
            </h2>
            <div className="space-y-5">
              {recentActivity.map((act) => (
                <div key={act.id} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{act.time}</p>
                  <p className="text-sm text-[#0F172A]">{act.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
