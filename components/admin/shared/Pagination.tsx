"use client";

import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  totalPages,
  shown,
  total,
  loading,
  onPage,
  noun,
}: {
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  loading?: boolean;
  onPage: (page: number) => void;
  noun: string;
}) {
  return (
    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
      <p className="text-xs text-muted-foreground">
        Mostrando {shown} de {total} {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPage(page - 1)}
            className="h-8 px-3"
          >
            ← Anterior
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPage(page + 1)}
            className="h-8 px-3"
          >
            Siguiente →
          </Button>
        </div>
      )}
    </div>
  );
}
