"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ShieldCheck, Save } from "lucide-react";
import { useSessionUser } from "@/lib/useSessionUser";
import { getInitials, getRoleLabel } from "@/lib/format";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import { apiSend } from "@/lib/client/api";

/**
 * Página de perfil compartida por admin y docente (montada en
 * app/admin/profile y app/teacher/profile). Permite editar nombre/teléfono
 * propios y cambiar la contraseña; email y rol son de solo lectura (los
 * edita un admin desde /admin/users).
 */
export default function ProfilePage() {
  const { user, loading } = useSessionUser();
  const [fullName, setFullName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  if (loading || !user) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
      </div>
    );
  }

  const nameValue = fullName ?? user.full_name;
  const phoneValue = phone ?? user.phone ?? "";
  const dirty = fullName !== null || phone !== null;

  async function handleSave() {
    if (!nameValue.trim()) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await apiSend("/api/auth/me", "PATCH", { fullName: nameValue.trim(), phone: phoneValue.trim() || null });
      toast.success("Perfil actualizado.");
      // El sidebar/navbar leen el nombre del SessionUserProvider, que no
      // expone un refetch; recargar es lo más simple para reflejar el cambio.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Mi perfil</h1>
        <p className="text-muted-foreground mt-1">
          Datos de tu cuenta en el sistema
        </p>
      </div>

      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#1E2A5E] text-white text-lg font-bold">
                {getInitials(nameValue)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-bold text-[#0F172A]">{nameValue}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[#1E2A5E]">Nombre completo</Label>
              <Input
                value={nameValue}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[#1E2A5E]">Correo electrónico</Label>
              <Input value={user.email} disabled className="bg-gray-50 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Para cambiar tu correo, contacta a un administrador.
              </p>
            </div>
            <div>
              <Label className="text-[#1E2A5E]">Teléfono</Label>
              <Input
                value={phoneValue}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="987 654 321"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-[#1E2A5E] text-white hover:bg-[#162043] gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1E2A5E]/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#1E2A5E]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Contraseña</p>
              <p className="text-xs text-muted-foreground">Cámbiala periódicamente por seguridad</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowChangePwd(true)}>
            Cambiar contraseña
          </Button>
        </CardContent>
      </Card>

      {showChangePwd && (
        <ChangePasswordModal
          user={{ id: user.id, fullName: user.full_name, email: user.email, role: user.role }}
          closable
          onClose={() => setShowChangePwd(false)}
          onSuccess={() => {
            toast.success("Contraseña actualizada.");
            setShowChangePwd(false);
          }}
        />
      )}
    </div>
  );
}
