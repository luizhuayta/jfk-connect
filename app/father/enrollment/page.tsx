"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  CalendarDays,
  BookOpen,
  Clock,
  Hash,
  GraduationCap,
  User,
  Download,
  Loader2,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type EnrollmentDoc = { label: string; submitted: boolean };

type Enrollment = {
  studentId: string;
  code: string;
  year: number;
  grade: string;
  section: string;
  shift: string;
  classroom: string;
  enrolledAt: string;
  status: "regular" | "condicional" | "pendiente";
  docs: EnrollmentDoc[];
  tutor: string;
};

const STATUS_CONFIG = {
  regular:     { label: "Matriculado",  bg: "bg-emerald-100 text-emerald-700" },
  condicional: { label: "Condicional",  bg: "bg-amber-100 text-amber-700" },
  pendiente:   { label: "Pendiente",    bg: "bg-red-100 text-red-700" },
};

export default function EnrollmentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [enrollmentCache, setEnrollmentCache] = useState<Record<string, Enrollment | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnrollment = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/father/enrollment?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setEnrollmentCache((prev) => ({ ...prev, [studentId]: data.enrollment }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando matrícula");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/father/students");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setStudents(data.students);
        if (data.students.length > 0) {
          const firstId = data.students[0].id;
          setActiveStudentId(firstId);
          await loadEnrollment(firstId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadEnrollment]);

  const handleSelectStudent = (studentId: string) => {
    setActiveStudentId(studentId);
    if (!(studentId in enrollmentCache)) loadEnrollment(studentId);
  };

  const student = students.find((s) => s.id === activeStudentId);
  const enrollment = (activeStudentId && enrollmentCache[activeStudentId]) || null;

  const docsOk    = enrollment?.docs.filter((d) => d.submitted).length ?? 0;
  const docsTotal = enrollment?.docs.length ?? 0;
  const docsPercent = docsTotal ? Math.round((docsOk / docsTotal) * 100) : 0;

  const initials = student?.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "";

  const enrolledDate = enrollment
    ? new Date(enrollment.enrolledAt + "T00:00:00").toLocaleDateString("es-PE", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando matrícula...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E2A5E]">Matrícula</h1>
        <p className="text-muted-foreground mt-1">
          Estado de matrícula — Año Lectivo 2026
        </p>
      </div>

      {/* Student Selector */}
      <div className="flex gap-3 flex-wrap">
        {students.map((s) => {
          const ini = s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const isActive = activeStudentId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelectStudent(s.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-[#1E2A5E] bg-[#1E2A5E]/5"
                  : "border-gray-200 bg-white hover:border-[#1E2A5E]/30"
              }`}
            >
              <Avatar className="h-9 w-9 border border-[#F4C15C]/40">
                <AvatarFallback className={`text-xs font-semibold ${isActive ? "bg-[#1E2A5E] text-white" : "bg-[#1E2A5E]/10 text-[#1E2A5E]"}`}>
                  {ini}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className={`text-sm font-semibold ${isActive ? "text-[#1E2A5E]" : "text-[#0F172A]"}`}>
                  {s.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.grade} &quot;{s.section}&quot;
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {enrollment ? (
        <>
          {/* Status banner */}
          <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-5 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-[#F4C15C]/40">
                <AvatarFallback className="bg-[#F4C15C]/20 text-[#F4C15C] font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-bold text-lg">{student?.name}</p>
                <p className="text-white/70 text-sm">
                  {enrollment.grade} &quot;{enrollment.section}&quot; · {enrollment.shift}
                </p>
              </div>
            </div>
            <Badge className={`text-sm font-bold px-4 py-2 ${STATUS_CONFIG[enrollment.status].bg} hover:${STATUS_CONFIG[enrollment.status].bg}`}>
              {STATUS_CONFIG[enrollment.status].label}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Enrollment details */}
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-base font-bold text-[#0F172A]">Datos de Matrícula</h2>
                <div className="space-y-3">
                  {[
                    { icon: Hash,         label: "Código",          value: enrollment.code },
                    { icon: CalendarDays, label: "Fecha de matrícula", value: enrolledDate },
                    { icon: GraduationCap,label: "Grado y sección", value: `${enrollment.grade} "${enrollment.section}"` },
                    { icon: Clock,        label: "Turno",           value: enrollment.shift },
                    { icon: BookOpen,     label: "Aula asignada",   value: enrollment.classroom },
                    { icon: User,         label: "Tutor",           value: enrollment.tutor },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E2A5E]/8 shrink-0">
                        <row.icon className="h-4 w-4 text-[#1E2A5E]" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-semibold text-[#0F172A]">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10 gap-2">
                  <Download className="h-4 w-4" />
                  Descargar constancia de matrícula
                </Button>
              </CardContent>
            </Card>

            {/* Documents checklist */}
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0F172A]">Documentos</h2>
                  <Badge
                    className={`text-xs font-bold ${
                      docsPercent === 100
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {docsOk}/{docsTotal} entregados
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progreso</span>
                    <span className="font-semibold text-[#1E2A5E]">{docsPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        docsPercent === 100 ? "bg-emerald-500" : "bg-[#F4C15C]"
                      }`}
                      style={{ width: `${docsPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {enrollment.docs.map((doc) => (
                    <div
                      key={doc.label}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        doc.submitted
                          ? "bg-emerald-50 border-emerald-100"
                          : "bg-red-50 border-red-100"
                      }`}
                    >
                      {doc.submitted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          doc.submitted ? "text-emerald-800" : "text-red-700"
                        }`}
                      >
                        {doc.label}
                      </span>
                      <span className="ml-auto text-xs font-semibold">
                        {doc.submitted ? (
                          <span className="text-emerald-600">Entregado</span>
                        ) : (
                          <span className="text-red-500">Pendiente</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {docsPercent < 100 && (
                  <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    ⚠️ Tienes documentos pendientes. Preséntate a Secretaría de lunes a
                    viernes de 8:00 a 13:00 hrs.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No se encontró información de matrícula.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
