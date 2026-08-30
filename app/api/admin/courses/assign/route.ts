/**
 * POST /api/admin/courses/assign
 *
 * Asigna (o reasigna) un docente a un curso.
 *
 * Antes: la validación comparaba `users.subject` (TEXT libre) contra
 * `courses.name`, un vestigio de antes de la migración 008. Ahora compara
 * por `area_id` (la clave semántica actual) — con fallback a subject/name
 * SOLO si a alguno le falta area_id (la migración 008 dejó Cívica, HGE y
 * Tutoría sin backfill a propósito: se repartieron entre otras áreas o
 * desaparecieron — ver esa migración, sección 4). Sin el fallback, esos
 * cursos dejarían de poder asignarse.
 *
 * También corrige el desync silencioso: antes esta ruta actualizaba
 * `courses.teacher_id` pero NUNCA tocaba `schedule_entries.teacher_id`
 * (que la migración 007 backfillea desde `courses` pero nadie mantenía al
 * día después) — el horario del docente quedaba desincronizado tras cada
 * reasignación. Ahora se actualiza en la misma transacción, y antes de
 * escribir se verifica que el docente no quede en dos secciones a la
 * misma hora (mismo motor que /api/admin/schedule::findTeacherConflicts).
 *
 * Body: { courseId: string, teacherId: string }
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { assignCourseTeacherSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { fetchCatalog } from "@/lib/curriculum/server";
import { areaMatches, type CandidateTeacher, type CandidateCourse } from "@/lib/courses/assignment";
import { findTeacherConflicts, type ScheduleSlotRef } from "@/lib/scheduleConflicts";
import { sectionShift } from "@/lib/section-shift";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  area_id: number | null;
}

interface TeacherRow {
  id: string;
  full_name: string;
  subject: string | null;
  area_id: number | null;
  role: string;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, assignCourseTeacherSchema);
  if (validationError) return validationError;

  const { courseId, teacherId } = parsed;

  try {
    const course = await queryOne<CourseRow>(
      "SELECT id, name, grade, section, area_id FROM courses WHERE id = $1",
      [courseId],
    );
    if (!course) {
      return NextResponse.json({ ok: false, error: "Curso no encontrado." }, { status: 404 });
    }

    const teacher = await queryOne<TeacherRow>(
      "SELECT id, full_name, subject, area_id, role, is_active FROM users WHERE id = $1",
      [teacherId],
    );
    if (!teacher) {
      return NextResponse.json({ ok: false, error: "Docente no encontrado." }, { status: 404 });
    }

    if (teacher.role !== "docente") {
      return NextResponse.json({ ok: false, error: "El usuario seleccionado no es docente." }, { status: 400 });
    }
    if (!teacher.is_active) {
      return NextResponse.json({ ok: false, error: "El docente está inactivo." }, { status: 400 });
    }

    const teacherCandidate: CandidateTeacher = {
      id: teacher.id,
      fullName: teacher.full_name,
      areaId: teacher.area_id,
      subject: teacher.subject,
      shiftPreference: null,
      isActive: teacher.is_active,
      role: teacher.role,
    };
    const courseCandidate: CandidateCourse = {
      id: course.id,
      name: course.name,
      grade: course.grade,
      section: course.section,
      areaId: course.area_id,
      hoursPerWeek: 0,
    };

    if (!areaMatches(teacherCandidate, courseCandidate)) {
      const { areas } = await fetchCatalog();
      const teacherAreaName = areas.find((a) => a.id === teacher.area_id)?.name ?? teacher.subject ?? "sin área asignada";
      return NextResponse.json(
        {
          ok: false,
          error: `Este docente dicta "${teacherAreaName}", no puede asignarse a "${course.name}".`,
        },
        { status: 400 },
      );
    }

    // Simula al docente ocupando las horas de ESTE curso (día/período que ya
    // tiene schedule_entries, backfilleadas por la migración 007) junto a
    // sus horas actuales en cualquier otra sección, y busca choques.
    const allEntries = await query<{
      grade: string;
      section: string;
      day: string;
      period: number;
      subject: string;
      teacher_id: string | null;
    }>(`SELECT grade, section, day, period, subject, teacher_id FROM schedule_entries`);

    const simulated: (ScheduleSlotRef & { teacherId: string | null })[] = allEntries.rows.map((e) => {
      const isThisCourseSlot = e.grade === course.grade && e.section === course.section && e.subject === course.name;
      return {
        grade: e.grade,
        section: e.section,
        day: e.day,
        period: e.period,
        subject: e.subject,
        shift: sectionShift(e.section),
        teacherId: isThisCourseSlot ? teacherId : e.teacher_id,
      };
    });

    const conflicts = findTeacherConflicts(simulated, (e) => e.teacherId).filter((c) => c.teacherId === teacherId);
    if (conflicts.length > 0) {
      const detail = conflicts
        .map((c) => {
          const sections = c.sections.map((s) => `${s.grade} "${s.section}"`).join(" y ");
          return `quedaría en ${sections} el ${c.day} a las ${c.period}ª hora`;
        })
        .join("; ");
      return NextResponse.json(
        { ok: false, error: `${teacher.full_name} ${detail} — cruza con su horario actual.` },
        { status: 409 },
      );
    }

    await withTransaction(async (client) => {
      await client.query("UPDATE courses SET teacher_id = $1, updated_at = now() WHERE id = $2", [
        teacherId,
        courseId,
      ]);
      // Antes desincronizado: la reasignación no tocaba schedule_entries.
      await client.query(
        `UPDATE schedule_entries SET teacher_id = $1, teacher = $2
         WHERE grade = $3 AND section = $4 AND subject = $5`,
        [teacherId, teacher.full_name, course.grade, course.section, course.name],
      );
    });

    return NextResponse.json({
      ok: true,
      message: `${teacher.full_name} asignado a ${course.name} — ${course.grade} "${course.section}".`,
    });
  } catch (err) {
    logger.error({ err, route: "admin/courses/assign" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
