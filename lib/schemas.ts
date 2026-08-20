/**
 * Esquemas de validación para las API routes de IJFK (Zod v4).
 *
 * Cada esquema define la forma esperada del body y, en sus mensajes, usa
 * español. `lib/validate.ts` los usa para fallar temprano con un 400 y un
 * mensaje claro, evitando código repetido en cada route.
 */

import { z } from "zod";

// Trim-no-vacío helper
const nonEmpty = (field: string) =>
  z
    .string({ message: `${field} es obligatorio.` })
    .trim()
    .min(1, `${field} es obligatorio.`);

const emailField = (label = "El correo") =>
  nonEmpty(label).toLowerCase().email(`${label} no es válido.`);

/** /api/auth/login */
export const loginSchema = z.object({
  email: emailField(),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

/** /api/auth/register */
export const registerSchema = z.object({
  fullName: nonEmpty("El nombre completo")
    .min(3, "El nombre completo es obligatorio."),
  email: emailField(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  year: z.enum(["1", "2", "3", "4", "5"], { message: "Año no válido." }),
  section: z.enum(
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
    { message: "Sección no válida." },
  ),
  shift: z.enum(["mañana", "tarde", "manana"], { message: "Turno no válido." }),
});

/** /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: emailField(),
});

/** /api/auth/verify — { email, code } */
export const verifySchema = z.object({
  email: emailField(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
});

/** /api/auth/reset-password — { email, code, newPassword } */
export const resetPasswordSchema = z.object({
  email: emailField(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

/** /api/auth/change-password — { currentPassword, newPassword } */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria."),
  newPassword: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
});

/** /api/auth/me (PATCH) — el usuario edita su propio nombre y teléfono */
export const updateOwnProfileSchema = z.object({
  fullName: nonEmpty("El nombre completo").min(3, "El nombre completo es obligatorio."),
  phone: z.string().trim().max(30, "Teléfono demasiado largo.").optional().nullable(),
});

/** /api/admin/users (POST) */
export const createUserSchema = z.object({
  email: emailField(),
  fullName: nonEmpty("El nombre completo"),
  role: z.enum(["admin", "docente", "padre"], { message: "Rol no válido." }),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
  // Nuevos campos para docentes:
  subject: z.string().trim().optional(),
  shiftPreference: z.enum(["Mañana", "Tarde", "Ambos", "manana"], { message: "Turno no válido." }).optional().default("Ambos"),
});

/** /api/admin/users/[id] (PATCH) */
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  role: z.enum(["admin", "docente", "padre"]).optional(),
  phone: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
  // Nuevos campos para docentes:
  subject: z.string().trim().optional().nullable(),
  shiftPreference: z.enum(["Mañana", "Tarde", "Ambos", "manana"]).optional(),
});

/** /api/announcements (POST) */
export const announcementCategoryEnum = z.enum([
  "urgente",
  "importante",
  "general",
  "informativo",
]);

export const createAnnouncementSchema = z.object({
  title: nonEmpty("El título"),
  body: nonEmpty("El contenido"),
  category: announcementCategoryEnum.optional(),
  audience: z.string().trim().min(1).optional(),
  sender: z.string().trim().optional(),
});

/** /api/announcements/[id] (PATCH) — todos los campos opcionales */
export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  category: announcementCategoryEnum.optional(),
  audience: z.string().trim().min(1).optional(),
});

/** /api/grades (PUT) — notas por competencia, compartido docente + admin */
export const competencyGradeEntrySchema = z.object({
  studentId: z.string().min(1),
  competencyId: z.number().int().positive(),
  score: z
    .number({ message: "La nota debe ser un número." })
    .min(0, "La nota no puede ser negativa.")
    .max(20, "La nota no puede superar 20.")
    .nullable(),
  conclusion: z.string().trim().max(500).optional(),
});

export const saveCompetencyGradesSchema = z.object({
  bimester: z.number().int().min(1).max(4),
  courseId: z.string().min(1).optional(),
  grade: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  transversal: z.boolean().optional(),
  entries: z.array(competencyGradeEntrySchema).min(1).max(2000),
});

/** /api/teacher/courses/[courseId]/attendance (POST) */
const attendanceStatusEnum = z.enum(["A", "F", "T", "J"]);

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  status: attendanceStatusEnum,
});

export const saveAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (YYYY-MM-DD)."),
  records: z.array(attendanceRecordSchema),
});

/** /api/father/attendance/justify (POST) — el padre justifica una falta */
export const justifyAttendanceSchema = z.object({
  attendanceId: z.string().min(1, "Registro de asistencia obligatorio."),
  reason: nonEmpty("El motivo").max(500, "El motivo no puede superar 500 caracteres."),
});

/** /api/teacher/courses/[courseId]/justifications/[id] (PATCH) */
export const reviewJustificationSchema = z.object({
  decision: z.enum(["aprobar", "rechazar"], { message: "Decisión no válida." }),
  response: z
    .string()
    .trim()
    .max(500, "La respuesta no puede superar 500 caracteres.")
    .optional()
    .nullable(),
});

/** /api/teacher/courses/[courseId]/materials (POST) */
const materialTypeEnum = z.enum(["pdf", "pptx", "docx", "xlsx", "img"]);

export const createMaterialSchema = z.object({
  title: nonEmpty("El título"),
  type: materialTypeEnum,
  size: z.string().optional().nullable(),
  topic: z.string().optional().nullable(),
});

// ─── Sprint 7: altas y gestión desde el panel admin ──────────────────────────

const schoolGradeEnum = z.enum(["1ro", "2do", "3ro", "4to", "5to"], {
  message: "Grado no válido.",
});
const schoolSectionField = z
  .string({ message: "La sección es obligatoria." })
  .trim()
  .toUpperCase()
  .regex(/^[A-M]$/, "La sección debe ser una letra de A a M.");
const schoolShiftEnum = z.enum(["Mañana", "Tarde"], {
  message: "Turno no válido.",
});
const studentStatusEnum = z.enum(["activo", "retirado", "trasladado"], {
  message: "Estado no válido.",
});

/** /api/admin/students (POST) */
export const createStudentSchema = z.object({
  dni: z
    .string({ message: "El DNI es obligatorio." })
    .trim()
    .regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
  fullName: nonEmpty("El nombre completo").min(
    3,
    "El nombre completo es obligatorio.",
  ),
  grade: schoolGradeEnum,
  section: schoolSectionField,
  shift: schoolShiftEnum,
});

/** /api/admin/students/[id] (PATCH) — cambiar estado o desvincular apoderado */
export const updateStudentSchema = z
  .object({
    status: studentStatusEnum.optional(),
    unlinkParent: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.unlinkParent === true, {
    message: "No hay campos para actualizar.",
  });

/** /api/admin/sections (POST) — crea la relación grado/sección (sus cursos) */
export const createSectionSchema = z.object({
  grade: schoolGradeEnum,
  section: schoolSectionField,
  shift: schoolShiftEnum,
  room: z.string().trim().max(50, "Aula demasiado larga.").optional(),
});

/** /api/admin/enrollments (POST) — matricula a un alumno existente */
export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, "El alumno es obligatorio."),
});

/** /api/admin/schedule (PATCH) — mover entradas de horario (drag-and-drop) */
const scheduleDayEnum = z.enum(
  ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  { message: "Día no válido." },
);

export const scheduleUpdateEntrySchema = z.object({
  id: nonEmpty("El id de la entrada"),
  day: scheduleDayEnum,
  period: z
    .number({ message: "El período es obligatorio." })
    .int("El período debe ser un número entero.")
    .min(1, "Período no válido.")
    .max(7, "Período no válido."),
  time: nonEmpty("El horario"),
});

export const updateScheduleSchema = z.object({
  updates: z.array(scheduleUpdateEntrySchema),
});

/** /api/admin/enrollments/[id] (PATCH) — pagos, documentos y estado */
export const updateEnrollmentSchema = z
  .object({
    status: z
      .enum(["regular", "condicional", "pendiente"], {
        message: "Estado de matrícula no válido.",
      })
      .optional(),
    docsSubmitted: z
      .number()
      .int("Los documentos deben ser un número entero.")
      .min(0, "Los documentos no pueden ser negativos.")
      .max(7, "El máximo de documentos es 7.")
      .optional(),
    apafaPaid: z.boolean().optional(),
    actividadesPaid: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.docsSubmitted !== undefined ||
      v.apafaPaid !== undefined ||
      v.actividadesPaid !== undefined,
    { message: "No hay campos para actualizar." },
  );