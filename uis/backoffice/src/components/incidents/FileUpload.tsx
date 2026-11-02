"use client";

import {
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type JSX,
} from "react";

interface FileUploadProps {
  /** Callback cuando un archivo es seleccionado/soltado correctamente */
  onFileSelected: (file: File) => void;
  /** Si true, deshabilita la interacción (durante carga) */
  disabled?: boolean;
}

type DragState = "idle" | "dragover" | "error";

export default function FileUpload({
  onFileSelected,
  disabled = false,
}: FileUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragState, setDragState] = useState<DragState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function reset() {
    setDragState("idle");
    setErrorMsg(null);
    setSelectedFileName(null);
  }

  function validateAndSelect(file: File | null) {
    setErrorMsg(null);
    if (!file) return;

    // Solo .csv
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setDragState("error");
      setErrorMsg("Solo se aceptan ficheros con extensión .csv.");
      return;
    }

    // Verificar tipo MIME orientativo
    const validMimeTypes = [
      "text/csv",
      "text/plain",
      "application/csv",
      "application/vnd.ms-excel",
    ];
    if (file.type && !validMimeTypes.includes(file.type)) {
      // No bloqueamos, solo advertimos
    }

    setSelectedFileName(file.name);
    setDragState("idle");
    onFileSelected(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragState("dragover");
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragState("dragover");
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    // Solo pasar a idle si realmente salimos del área
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragState("idle");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragState("idle");

    const files = event.dataTransfer.files;
    if (files.length === 0) return;
    validateAndSelect(files[0]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    validateAndSelect(files[0]);
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = "";
  }

  function handleClick() {
    if (disabled) return;
    inputRef.current?.click();
  }

  // Clases según estado
  const borderColor =
    dragState === "dragover"
      ? "border-leaf"
      : dragState === "error"
        ? "border-red-400"
        : "border-slate-300";

  const bgColor =
    dragState === "dragover"
      ? "bg-leaf/5"
      : "bg-white";

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex cursor-pointer flex-col items-center justify-center rounded-lg
          border-2 border-dashed px-6 py-10 text-center transition-colors duration-150
          ${borderColor} ${bgColor}
          ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-leaf/50"}
          focus-visible:outline-3 focus-visible:outline-leaf
        `}
      >
        {/* Icono de subida */}
        <svg
          className="mb-3 h-10 w-10 text-muted"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {selectedFileName ? (
          <div>
            <p className="text-sm font-medium text-ink">
              Archivo listo: <span className="font-semibold">{selectedFileName}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              Vuelve a hacer clic o arrastra otro archivo para cambiarlo
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-ink">
              <span className="font-semibold text-forest">Selecciona un archivo</span> o arrastra y suelta
            </p>
            <p className="mt-1 text-xs text-muted">Solo archivos CSV</p>
          </div>
        )}
      </div>

      {/* Error de validación del input */}
      {errorMsg && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-700" role="alert">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {errorMsg}
        </p>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        aria-hidden="true"
        className="sr-only"
        tabIndex={-1}
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}