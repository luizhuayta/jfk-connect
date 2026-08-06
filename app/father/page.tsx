"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, FileCheck, AlertCircle, CalendarDays, Loader2, Plus, GraduationCap, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import { letterGrade, letterGradeColor } from "@/lib/letter-grade";

const quickAccess = [
  {
    label: "Ver Horario",
    sublabel: "Horario de clases",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    href: "/father/schedule",
  },
  {
    label: "Estado de Matrícula",
    sublabel: "Al día",
    icon: FileCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    href: "/father/enrollment",
  },
  {
    label: "Asistencia del Mes",
    sublabel: "95% asistencia",
    icon: CalendarDays,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    href: "/father/attendance",
  },
  {
    label: "Avisos Importantes",
    sublabel: "3 avisos nuevos",
    icon: AlertCircle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    href: "/father/announcements",
  },
];

type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type GradeRow = {
  bimester: number;
  course: string;
  note: number;
  level: "AD" | "A" | "B" | "C" | null;
  observation: string;
};

const BIMESTERS = ["1", "2", "3", "4"];

export default function FatherDashboard() {
  const [userName, setUserName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [activeChild, setActiveChild] = useState<string | null>(null);
  const [activeBimester, setActiveBimester] = useState("1");
  const [gradesCache, setGradesCache] = useState<Record<string, Record<string, GradeRow[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [dismissedClaim, setDismissedClaim] = useState(false);

  const loadGrades = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/father/grades?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setGradesCache((prev) => ({ ...prev, [studentId]: data.grades }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando notas");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meRes, stRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/father/students"),
        ]);
        const me = await meRes.json();
        const st = await stRes.json();
        if (!st.ok) throw new Error(st.error);
        if (me.ok) setUserName(me.user.full_name);
        setStudents(st.students);
        if (st.students.length > 0) {
          const firstId = st.students[0].id;
          setActiveChild(firstId);
          await loadGrades(firstId);
        } else if (!dismissedClaim) {
          // Sin hijos: abrir modal de reclamo automáticamente
          setShowClaimModal(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadGrades]);

  const handleSelectChild = (studentId: string) => {
    setActiveChild(studentId);
    if (!gradesCache[studentId]) loadGrades(studentId);
  };

  // Recargar lista de hijos tras un reclamo exitoso
  const reloadStudents = async () => {
    try {
      const r = await fetch("/api/father/students");
      const data = await r.json();
      if (data.ok) {
        setStudents(data.students);
        if (data.students.length > 0 && !activeChild) {
          const firstId = data.students[0].id;
          setActiveChild(firstId);
          loadGrades(firstId);
        }
      }
    } catch {
      // silencioso
    }
  };

  const handleClaimed = (student: { id: string; name: string; grade: string; section: string }) => {
    reloadStudents();
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setDismissedClaim(true);
  };

  const canAddMore = students.length < 5;

  const selectedStudent = students.find((s) => s.id === activeChild);
  const currentNotes = (activeChild && gradesCache[activeChild]?.[activeBimester]) || [];
  const average =
    currentNotes.reduce((sum, n) => sum + n.note, 0) / (currentNotes.length || 1);
  const levelLabel =
    average >= 17.5 ? "Excelente" : average >= 14 ? "Bueno" : "Regular";

  const today = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-600 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E2A5E]">
          Bienvenido, Sr. {userName}
        </h1>
        <p className="text-muted-foreground mt-1" suppressHydrationWarning>
          {todayFormatted}
        </p>
      </div>

      {/* Mis Hijos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0F172A]">Mis Hijos</h2>
          {canAddMore && (
            <Button
              onClick={() => setShowClaimModal(true)}
              variant="outline"
              className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white h-9 gap-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Agregar hijo
            </Button>
          )}
        </div>
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No tienes hijos vinculados. Usa tu código de matrícula para vincularlos.
            </p>
            <Button
              onClick={() => setShowClaimModal(true)}
              className="bg-[#1E2A5E] text-white hover:bg-[#162043] gap-2"
            >
              <Plus className="h-4 w-4" /> Vincular a mi hijo
            </Button>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((child) => {
            const initials = child.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Card
                key={child.id}
                className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-[#F4C15C]/30">
                      <AvatarFallback className="bg-[#1E2A5E]/10 text-[#1E2A5E] font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {child.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-1 bg-gray-100 text-[#64748B] font-medium text-xs"
                      >
                        {child.grade} &quot;{child.section}&quot;
                      </Badge>
                    </div>
                  </div>
                  <Link href="/father/students">
                    <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10">
                      Ver detalle
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </section>

      {/* Notas Recientes */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-[#0F172A]">Notas Recientes</h2>
            <div className="flex gap-2">
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectChild(s.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    activeChild === s.id
                      ? "bg-[#1E2A5E] text-white shadow-sm"
                      : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                  }`}
                >
                  {s.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {selectedStudent && (
            <p className="text-sm text-muted-foreground -mt-4">
              {selectedStudent.name} — {selectedStudent.grade} &quot;{selectedStudent.section}&quot;
            </p>
          )}

          {/* Bimester Tabs */}
          <div className="bg-gray-50 rounded-lg p-1">
            <div className="grid grid-cols-4 gap-1">
              {BIMESTERS.map((b) => (
                <button
                  key={b}
                  onClick={() => setActiveBimester(b)}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeBimester === b
                      ? "bg-[#1E2A5E] text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Bimestre {b}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Curso</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nota</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nivel</TableHead>
                  <TableHead className="text-right text-[#0F172A] font-semibold text-sm">
                    Observación
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentNotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Aún no hay notas registradas para este bimestre.
                    </TableCell>
                  </TableRow>
                )}
                {currentNotes.map((row, idx) => {
                  const ltr = letterGrade(row.note);
                  const rowBg =
                    row.note >= 17
                      ? "border-l-emerald-400"
                      : row.note >= 14
                      ? "border-l-blue-400"
                      : "border-l-amber-400";
                  return (
                    <TableRow key={idx} className={`border-l-4 hover:bg-gray-50/50 ${rowBg}`}>
                      <TableCell className="text-sm font-medium text-[#0F172A] py-2.5">
                        {row.course}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-[#1E2A5E] py-2.5">
                        {row.note.toFixed(1)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[11px] font-bold ${
                              row.level === "AD"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {row.level ?? "—"}
                          </Badge>
                          {ltr && (
                            <Badge className={`text-[11px] font-bold ${letterGradeColor(ltr)}`}>
                              {ltr}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                        {row.observation}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Promedio */}
          <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Promedio del Bimestre</p>
                <p className="text-3xl font-bold text-[#F4C15C] mt-1">{average.toFixed(1)}</p>
              </div>
              {letterGrade(average) && (
                <div className={`h-14 w-14 rounded-xl border-2 flex items-center justify-center font-bold text-xl ${letterGradeColor(letterGrade(average))}`}>
                  {letterGrade(average)}
                </div>
              )}
            </div>
            <Badge className="bg-[#F4C15C] text-[#1E2A5E] font-bold text-sm px-3 py-1 hover:bg-[#F4C15C]">
              {levelLabel}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/father/grades">
              <Button
                variant="outline"
                className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
              >
                Ver Todas las Notas
              </Button>
            </Link>
            <Button
              variant="outline"
              className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
            >
              Descargar Boletín PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <section>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickAccess.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${item.iconBg}`}
                  >
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Modal de reclamo de hijo */}
      <ClaimChildModal
        open={showClaimModal}
        onClose={handleCloseClaimModal}
        onClaimed={handleClaimed}
        canAddMore={canAddMore}
      />
    </div>
  );
}
