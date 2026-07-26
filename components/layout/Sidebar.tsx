"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Menu,
  GraduationCap,
  ClipboardList,
  CalendarDays,
  Bell,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  items: SidebarItem[];
  role: string;
}

export default function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname();

  const navItems = (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile */}
      <Sheet>
        <SheetTrigger>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b px-6">
            <span className="text-lg font-bold text-primary">IJFK</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {role}
            </span>
          </div>
          {navItems}
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-bold text-primary">IJFK</span>
          <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {role}
          </span>
        </div>
        <div className="flex-1 overflow-auto py-2">{navItems}</div>
      </aside>
    </>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 shadow-sm">
      <div className="flex flex-1 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <span className="text-lg font-bold text-primary">IJFK</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </Button>
      </div>
    </header>
  );
}
