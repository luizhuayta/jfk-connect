/**
 * Guardas de autorización a nivel de recurso (server-side).
 *
 * Complementan a lib/auth.ts (que verifica sesión y rol) comprobando que
 * el usuario autenticado es dueño del recurso concreto que pide.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole, requireUser, type AuthUser } from "@/lib/auth";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { uuidParamSchema } from "@/lib/schemas";

/**
 * Devuelve true si el estudiante pertenece al padre indicado.
 */
export async function studentBelongsToParent(
  studentId: string,
  parentId: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM students WHERE id = $1 AND parent_id = $2",
    [studentId, parentId],
  );
  return row !== null;
}

/**
 * Combina requireRole('padre') + lectura de ?studentId= + verificación de
 * pertenencia en un solo paso. Usado por las rutas GET /api/father/* que
 * devuelven datos de un hijo concreto (grades, attendance, schedule,
 * materials, enrollment) — antes repetían este mismo bloque cada una.
 */
export async function requireOwnedStudent(
  request: NextRequest,
): Promise<[string, null] | [null, NextResponse]> {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return [null, denied];

  const { searchParams } = new URL(request.url);
  const studentIdRaw = searchParams.get("studentId");
  if (!studentIdRaw) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Falta el parámetro studentId." },
        { status: 400 },
      ),
    ];
  }

  const parsedId = uuidParamSchema.safeParse(studentIdRaw);
  if (!parsedId.success) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Identificador no válido." },
        { status: 400 },
      ),
    ];
  }
  const studentId = parsedId.data;

  if (!(await studentBelongsToParent(studentId, user.id))) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Este estudiante no está vinculado a tu cuenta." },
        { status: 403 },
      ),
    ];
  }

  return [studentId, null];
}

/**
 * Devuelve true si el curso está asignado al docente indicado.
 */
export async function courseBelongsToTeacher(
  courseId: string,
  teacherId: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM courses WHERE id = $1 AND teacher_id = $2",
    [courseId, teacherId],
  );
  return row !== null;
}

export type CourseRef = {
  id: string;
  grade: string;
  section: string;
  areaId: number | null;
  teacherId: string | null;
};

interface CourseRow {
  id: string;
  grade: string;
  section: string;
  area_id: number | null;
  teacher_id: string | null;
}

/**
 * Docente dueño del curso, o admin (salvo `allowAdmin: false`). Reemplaza el
 * bloque `requireRole(["docente","admin"]) + courseBelongsToTeacher(...)`
 * que antes estaba copiado literal en 8+ rutas de /api/teacher/courses/
 * (grades, students, attendance, materials, justifications) — cada una
 * además repetía su propio `SELECT grade, section FROM courses WHERE
 * id=$1` justo después; acá ya viene resuelto en `course`.
 *
 * `allowAdmin` por defecto es `true` (mismo comportamiento que las rutas
 * GET existentes, donde el admin puede leer cualquier curso). Las rutas de
 * escritura que NO admitían admin antes (attendance/materials/
 * justifications PUT-POST-DELETE) deben pasar `allowAdmin: false`
 * explícito para no ampliarles el permiso sin querer — el único sitio
 * donde de verdad se amplía a propósito es el de notas.
 */
export async function requireOwnedCourse(
  request: NextRequest,
  courseId: string,
  opts?: { allowAdmin?: boolean },
): Promise<[{ user: AuthUser; course: CourseRef }, null] | [null, NextResponse]> {
  const parsedId = uuidParamSchema.safeParse(courseId);
  if (!parsedId.success) {
    return [
      null,
      NextResponse.json({ ok: false, error: "Identificador no válido." }, { status: 400 }),
    ];
  }

  const allowAdmin = opts?.allowAdmin ?? true;
  const roles: AuthUser["role"][] = allowAdmin ? ["docente", "admin"] : ["docente"];

  const [user, denied] = await requireRole(request, roles);
  if (denied) return [null, denied];

  const row = await queryOne<CourseRow>(
    "SELECT id, grade, section, area_id, teacher_id FROM courses WHERE id = $1",
    [parsedId.data],
  );
  if (!row) {
    return [
      null,
      NextResponse.json({ ok: false, error: "Curso no encontrado." }, { status: 404 }),
    ];
  }

  if (user.role !== "admin" && row.teacher_id !== user.id) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Este curso no está asignado a tu cuenta." },
        { status: 403 },
      ),
    ];
  }

  const course: CourseRef = {
    id: row.id,
    grade: row.grade,
    section: row.section,
    areaId: row.area_id,
    teacherId: row.teacher_id,
  };
  return [{ user, course }, null];
}

/**
 * Docente tutor de la sección (tabla section_tutors), o admin. Para las
 * competencias transversales, que no pertenecen a ningún curso — no hay
 * `courseId` que validar con `requireOwnedCourse`, solo grado+sección.
 */
export async function requireTutoredSection(
  request: NextRequest,
  grade: string,
  section: string,
  year: number = SCHOOL_YEAR,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return [null, denied];

  if (user.role === "admin") return [user, null];

  const row = await queryOne<{ id: string }>(
    `SELECT id FROM section_tutors WHERE grade = $1 AND section = $2 AND year = $3 AND teacher_id = $4`,
    [grade, section, year, user.id],
  );
  if (!row) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "No eres tutor de esta sección." },
        { status: 403 },
      ),
    ];
  }
  return [user, null];
}

export type StudentRef = { id: string; grade: string; section: string };

/**
 * Padre dueño del estudiante, admin, o (si `allowTutor`) el docente tutor
 * de su sección. Usado por /api/libreta, que un padre descarga para su
 * hijo pero que el admin y el tutor también deben poder ver/descargar.
 */
export async function requireStudentAccess(
  request: NextRequest,
  studentId: string,
  opts?: { allowTutor?: boolean },
): Promise<[{ user: AuthUser; student: StudentRef }, null] | [null, NextResponse]> {
  const [user, denied] = await requireUser(request);
  if (denied) return [null, denied];

  const student = await queryOne<StudentRef>(
    "SELECT id, grade, section FROM students WHERE id = $1",
    [studentId],
  );
  if (!student) {
    return [
      null,
      NextResponse.json({ ok: false, error: "Estudiante no encontrado." }, { status: 404 }),
    ];
  }

  if (user.role === "admin") return [{ user, student }, null];

  if (user.role === "padre") {
    if (await studentBelongsToParent(studentId, user.id)) {
      return [{ user, student }, null];
    }
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Este estudiante no está vinculado a tu cuenta." },
        { status: 403 },
      ),
    ];
  }

  if (user.role === "docente" && opts?.allowTutor) {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM section_tutors WHERE grade = $1 AND section = $2 AND year = $3 AND teacher_id = $4`,
      [student.grade, student.section, SCHOOL_YEAR, user.id],
    );
    if (row) return [{ user, student }, null];
  }

  return [
    null,
    NextResponse.json({ ok: false, error: "No tienes acceso a este estudiante." }, { status: 403 }),
  ];
}
