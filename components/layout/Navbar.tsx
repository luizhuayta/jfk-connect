"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Bell } from "lucide-react";
import Image from "next/image";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function getRoleLabel(role: string): string {
  if (role === "docente") return "Docente";
  if (role === "admin") return "Administrador";
  if (role === "padre") return "Padre/Apoderado";
  return role;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  // Cargar usuario desde la cookie httpOnly via /api/auth/me
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const isAdmin = pathname.startsWith("/admin");
  const isTeacher = pathname.startsWith("/teacher");

  const searchPlaceholder = isAdmin
    ? "Buscar usuarios, cursos, notas..."
    : isTeacher
    ? "Buscar alumno, curso..."
    : "Buscar...";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-[240px]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden">
          <Image
            src="/Image/logo.jpg"
            alt="Logo CIJK"
            width={36}
            height={36}
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-[#1E2A5E] tracking-tight">
            CIJK
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isAdmin ? "Panel Admin" : "Kennedy"}
          </span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="w-full rounded-full border-gray-200 bg-gray-50 pl-10 text-sm focus-visible:ring-[#F4C15C]"
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-gray-50 transition-colors">
          <Bell className="h-5 w-5 text-[#1E2A5E]" />
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-100">
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-[#0F172A]">
              {user?.full_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user ? getRoleLabel(user.role) : ""}
            </p>
          </div>
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarFallback className="bg-[#1E2A5E] text-white text-xs font-semibold">
              {user ? getInitials(user.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}