import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcionSelect {
  valor: string;
  etiqueta: string;
}

interface SelectProps {
  value: string;
  onChange: (valor: string) => void;
  opciones: OpcionSelect[];
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Select con menú propio, alineado con los tokens visuales del sistema.
 * Mantiene un <select> nativo oculto para formularios, accesibilidad y pruebas.
 */
export function Select({
  value,
  onChange,
  opciones,
  id,
  ariaLabel,
  placeholder = "Selecciona una opción",
  disabled = false,
  required = false,
  className,
}: SelectProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const seleccionada = opciones.find((opcion) => opcion.valor === value);

  useEffect(() => {
    if (!abierto) return;
    function cerrarAlFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    }
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", cerrarAlFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarAlFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className={cn("relative min-w-0", className)}>
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        onChange={(evento) => onChange(evento.target.value)}
        className="sr-only"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={menuId}
        aria-label={ariaLabel ? `Abrir ${ariaLabel.toLowerCase()}` : "Abrir opciones"}
        onClick={() => setAbierto((estado) => !estado)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-field border border-line bg-surface px-4 text-left text-sm outline-none transition-colors",
          "hover:bg-app focus-visible:ring-2 focus-visible:ring-primary-500/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
          abierto && "ring-2 ring-primary-500/40",
        )}
      >
        <span className={cn("truncate", seleccionada ? "text-ink" : "text-ink-soft")}>
          {seleccionada?.etiqueta ?? placeholder}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className={cn("shrink-0 text-ink-soft transition-transform", abierto && "rotate-180")}
        />
      </button>

      {abierto && (
        <ul
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-field border border-line bg-surface p-1 shadow-card"
        >
          {opciones.map((opcion) => {
            const activo = opcion.valor === value;
            return (
              <li key={opcion.valor} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={activo}
                  onClick={() => {
                    onChange(opcion.valor);
                    setAbierto(false);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-colors",
                    activo
                      ? "bg-primary-50 font-semibold text-primary-600"
                      : "text-ink hover:bg-app",
                  )}
                >
                  <span className="min-w-0 truncate">{opcion.etiqueta}</span>
                  {activo && <Check size={16} strokeWidth={2} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
