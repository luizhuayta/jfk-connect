"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

const MAX_MB = 8;

/**
 * Primer `<input type="file">` del repo — no había ningún patrón de subida
 * de archivos que copiar (ver exploración previa). Drag & drop + click,
 * validación de tamaño en cliente antes de subir (la validación real de
 * verdad es del servidor — lib/validate.ts::parseFormData — esto es solo
 * para no hacer esperar al docente por un archivo que el servidor va a
 * rechazar de todas formas).
 */
export default function UploadDropzone({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo supera el tamaño máximo de ${MAX_MB} MB.`);
      return;
    }
    setSelected(file);
    onFileSelected(file);
  }

  function clear() {
    setSelected(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (selected) {
    const isImage = selected.type.startsWith("image/");
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        {isImage ? (
          <ImageIcon className="h-8 w-8 text-[#1E2A5E] shrink-0" />
        ) : (
          <FileSpreadsheet className="h-8 w-8 text-[#1E2A5E] shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0F172A] truncate">{selected.name}</p>
          <p className="text-xs text-muted-foreground">{(selected.size / 1024).toFixed(0)} KB</p>
        </div>
        {!disabled && (
          <button onClick={clear} className="p-1 rounded hover:bg-gray-200" aria-label="Quitar archivo">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
        dragOver ? "border-[#1E2A5E] bg-[#1E2A5E]/5" : "border-gray-200 hover:border-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-[#0F172A]">Arrastra un archivo o haz clic para elegirlo</p>
      <p className="text-xs text-muted-foreground">Excel (.xlsx), CSV, o foto JPG/PNG — máx. {MAX_MB} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,image/jpeg,image/png"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
