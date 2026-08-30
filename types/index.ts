export interface User {
  id: string;
  name: string;
  email: string;
  role: "father" | "teacher" | "admin";
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  average: number;
}

export interface Course {
  id: string;
  name: string;
  students: number;
  schedule: string;
}

export interface Note {
  id: string;
  studentName: string;
  course: string;
  value: number;
  date: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  date: string;
}

export interface Stat {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}
