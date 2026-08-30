export const APP_NAME = "IJFK - Sistema Institucional";

export const ROLES = {
  FATHER: "father",
  TEACHER: "teacher",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
