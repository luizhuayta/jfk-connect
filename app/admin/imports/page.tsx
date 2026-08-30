"use client";

import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import ImportWizard from "@/components/imports/ImportWizard";
import { useAdminCourseScopes } from "@/lib/admin/useAdminCourses";
import { AdminPageHeader } from "@/components/admin/shared";

export default function AdminImportsPage() {
  const { options, loading, error, reload } = useAdminCourseScopes();

  if (loading) return <LoadingState label="Cargando cursos..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Importar notas"
        subtitle="Sube un Excel, CSV, o una foto de un acta de notas — revisa las coincidencias antes de aplicarlas."
      />
      <ImportWizard scopeOptions={options} />
    </div>
  );
}
