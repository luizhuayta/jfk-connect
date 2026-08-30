/**
 * Motor determinista de asignación docente↔curso — IJFK.
 *
 * La IA NO decide nada aquí: este módulo calcula bloqueos duros (nunca se
 * propone) y un puntaje blando (0-100) con razones en español, de forma
 * 100% reproducible — mismos datos de entrada, mismo resultado siempre. La
 * única pieza de IA de esta feature (POST /api/admin/courses/assign/explain,
 * ver esa ruta) redacta un párrafo a partir de las `reasons`/`blockers` que
 * este motor ya calculó; no ve nada más y no puede cambiar el resultado.
 *
 * Complejidad: voraz por escasez (greedy), O(n·m) sobre ~715 cursos —
 * sobrada para este tamaño. El óptimo exacto sería un emparejamiento
 * bipartito (Hungarian / min-cost flow); la heurística basta aquí porque
 * los bloqueos duros de área reducen el espacio de búsqueda a decenas de
 * candidatos por curso, no cientos.
 */

import { sectionShift } from "@/lib/section-shift";
import { findTeacherConflicts, type ScheduleSlotRef } from "@/lib/scheduleConflicts";

export interface CandidateTeacher {
  id: string;
  fullName: string;
  areaId: number | null;
  subject: string | null;
  shiftPreference: string | null;
  isActive: boolean;
  role: string;
}

export interface CandidateCourse {
  id: string;
  name: string;
  grade: string;
  section: string;
  areaId: number | null;
  hoursPerWeek: number;
}

export interface TeacherLoad {
  courseCount: number;
  weeklyHours: number;
  gradesTaught: Set<string>;
  isTutorOfSection: boolean;
}

export interface CandidateScore {
  teacherId: string;
  teacherName: string;
  score: number;
  reasons: string[];
  blockers: string[];
  eligible: boolean;
}

/** ¿El área del docente calza con la del curso? Con fallback legacy: si a alguno le falta area_id, compara por subject/name (ver migración 008 — Cívica/HGE/Tutoría pueden quedar con area_id NULL). */
export function areaMatches(teacher: CandidateTeacher, course: CandidateCourse): boolean {
  if (teacher.areaId !== null && course.areaId !== null) {
    return teacher.areaId === course.areaId;
  }
  return Boolean(teacher.subject) && teacher.subject === course.name;
}

/**
 * Calcula bloqueos duros y puntaje blando para UN candidato sobre UN curso.
 * `conflicts` ya viene calculado por el caller (findTeacherConflicts sobre
 * el horario simulado con este docente puesto en las horas del curso).
 */
export function scoreCandidate(args: {
  teacher: CandidateTeacher;
  course: CandidateCourse;
  load: TeacherLoad;
  avgWeeklyHoursInArea: number;
  hasConflict: boolean;
}): CandidateScore {
  const { teacher, course, load, avgWeeklyHoursInArea, hasConflict } = args;
  const blockers: string[] = [];

  if (teacher.role !== "docente") blockers.push("El usuario seleccionado no es docente.");
  if (!teacher.isActive) blockers.push("El docente está inactivo.");
  if (!areaMatches(teacher, course)) {
    blockers.push(`El docente no dicta el área curricular de "${course.name}".`);
  }
  if (hasConflict) blockers.push("Cruza con otra hora ya asignada al docente en el horario.");

  if (blockers.length > 0) {
    return { teacherId: teacher.id, teacherName: teacher.fullName, score: -1, reasons: [], blockers, eligible: false };
  }

  const reasons: string[] = [];
  let score = 0;

  const courseShift = sectionShift(course.section);
  if (teacher.shiftPreference === courseShift) {
    score += 25;
    reasons.push(`Su preferencia de turno (${courseShift}) coincide con la sección.`);
  } else if (teacher.shiftPreference === "Ambos") {
    score += 12;
    reasons.push("Puede dictar en ambos turnos.");
  }

  // Carga: escala inversa frente al promedio del área — menos cargado, más puntaje (0..30).
  if (avgWeeklyHoursInArea > 0) {
    const ratio = load.weeklyHours / avgWeeklyHoursInArea;
    const loadScore = Math.max(0, Math.round(30 * (1 - Math.min(ratio, 1))));
    if (loadScore > 0) {
      score += loadScore;
      reasons.push(`Tiene ${load.weeklyHours}h semanales frente a un promedio de ${Math.round(avgWeeklyHoursInArea)}h en su área.`);
    }
  }

  if (load.gradesTaught.has(course.grade)) {
    score += 20;
    reasons.push(`Ya dicta otra sección de ${course.grade}, lo que favorece la continuidad pedagógica.`);
  }

  if (load.isTutorOfSection) {
    score += 10;
    reasons.push(`Es tutor de ${course.grade} "${course.section}".`);
  }

  if (load.courseCount === 0) {
    score += 15;
    reasons.push("Actualmente no tiene ningún curso asignado.");
  }

  return { teacherId: teacher.id, teacherName: teacher.fullName, score, reasons, blockers: [], eligible: true };
}

export interface ProposalInput {
  course: CandidateCourse;
  teachers: CandidateTeacher[];
  loadByTeacher: Map<string, TeacherLoad>;
  avgWeeklyHoursInArea: number;
  /** Entradas de horario ya existentes (para simular conflictos). */
  scheduleEntries: (ScheduleSlotRef & { teacherId: string | null })[];
}

export interface Proposal {
  courseId: string;
  candidates: CandidateScore[];
  best: CandidateScore | null;
}

/** Rankea todos los candidatos elegibles para UN curso (bloqueados incluidos, al final, para que la UI pueda mostrar por qué se descartó a alguien). */
export function rankCandidatesForCourse(args: {
  course: CandidateCourse;
  teachers: CandidateTeacher[];
  loadByTeacher: Map<string, TeacherLoad>;
  avgWeeklyHoursInArea: number;
  scheduleEntries: (ScheduleSlotRef & { teacherId: string | null })[];
}): CandidateScore[] {
  const { course, teachers, loadByTeacher, avgWeeklyHoursInArea, scheduleEntries } = args;
  const courseShift = sectionShift(course.section);

  const scored = teachers.map((teacher) => {
    // Simula al docente ocupando las horas del curso, junto a sus horas
    // actuales, y busca choques — mismo motor que usa el horario del admin.
    const simulated: (ScheduleSlotRef & { teacherId: string | null })[] = scheduleEntries.map((e) => {
      const isThisCourseSlot = e.grade === course.grade && e.section === course.section && e.subject === course.name;
      return isThisCourseSlot ? { ...e, teacherId: teacher.id, shift: courseShift } : e;
    });
    const conflicts = findTeacherConflicts(simulated, (e) => e.teacherId);
    const hasConflict = conflicts.some((c) => c.teacherId === teacher.id);

    const load = loadByTeacher.get(teacher.id) ?? {
      courseCount: 0,
      weeklyHours: 0,
      gradesTaught: new Set<string>(),
      isTutorOfSection: false,
    };

    return scoreCandidate({ teacher, course, load, avgWeeklyHoursInArea, hasConflict });
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Asigna cursos a docentes de forma voraz-por-escasez: el curso con MENOS
 * candidatos elegibles se resuelve primero (es el más restringido), y cada
 * elección recalcula conflictos antes de la siguiente — así un docente no
 * queda "reservado" por dos cursos que se solapan en horario.
 *
 * Empates se rompen de forma determinista (menor carga → orden alfabético
 * del nombre), nunca por IA: la reproducibilidad es un requisito, no una
 * preferencia de estilo.
 */
export function proposeAssignments(args: {
  courses: CandidateCourse[];
  teachers: CandidateTeacher[];
  scheduleEntries: (ScheduleSlotRef & { teacherId: string | null })[];
  avgWeeklyHoursByArea: Map<number, number>;
}): Proposal[] {
  const { courses, teachers, avgWeeklyHoursByArea } = args;
  let scheduleEntries = args.scheduleEntries;

  const loadByTeacher = new Map<string, TeacherLoad>();
  for (const teacher of teachers) {
    const own = scheduleEntries.filter((e) => e.teacherId === teacher.id);
    const weeklyHours = own.length;
    const grades = new Set(own.map((e) => e.grade));
    loadByTeacher.set(teacher.id, {
      courseCount: 0,
      weeklyHours,
      gradesTaught: grades,
      isTutorOfSection: false,
    });
  }

  const remaining = [...courses];
  const proposals: Proposal[] = [];

  while (remaining.length > 0) {
    // Rankea TODOS los cursos restantes para encontrar el más restringido.
    const ranked = remaining.map((course) => ({
      course,
      candidates: rankCandidatesForCourse({
        course,
        teachers,
        loadByTeacher,
        avgWeeklyHoursInArea: avgWeeklyHoursByArea.get(course.areaId ?? -1) ?? 0,
        scheduleEntries,
      }),
    }));

    ranked.sort((a, b) => {
      const eligibleA = a.candidates.filter((c) => c.eligible).length;
      const eligibleB = b.candidates.filter((c) => c.eligible).length;
      if (eligibleA !== eligibleB) return eligibleA - eligibleB;
      return a.course.id.localeCompare(b.course.id); // determinista ante empate total
    });

    const chosen = ranked[0];
    const idx = remaining.findIndex((c) => c.id === chosen.course.id);
    remaining.splice(idx, 1);

    const eligibleCandidates = chosen.candidates.filter((c) => c.eligible);
    const best =
      eligibleCandidates.length === 0
        ? null
        : eligibleCandidates.reduce((top, cur) => {
            if (cur.score !== top.score) return cur.score > top.score ? cur : top;
            const loadTop = loadByTeacher.get(top.teacherId)?.weeklyHours ?? 0;
            const loadCur = loadByTeacher.get(cur.teacherId)?.weeklyHours ?? 0;
            if (loadCur !== loadTop) return loadCur < loadTop ? cur : top;
            return cur.teacherName.localeCompare(top.teacherName) < 0 ? cur : top;
          });

    proposals.push({ courseId: chosen.course.id, candidates: chosen.candidates, best });

    if (best) {
      // Reserva las horas del curso para este docente antes de resolver el
      // siguiente — así el siguiente ranking ya ve el conflicto real.
      scheduleEntries = scheduleEntries.map((e) =>
        e.grade === chosen.course.grade && e.section === chosen.course.section && e.subject === chosen.course.name
          ? { ...e, teacherId: best.teacherId }
          : e,
      );
      const load = loadByTeacher.get(best.teacherId);
      if (load) {
        load.courseCount += 1;
        load.gradesTaught.add(chosen.course.grade);
      }
    }
  }

  return proposals;
}
