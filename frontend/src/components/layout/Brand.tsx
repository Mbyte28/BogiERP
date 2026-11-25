import { Store } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-[0_6px_18px_rgba(172,89,219,0.35)]">
        <Store size={22} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-ink">
          Tienda Condominio
        </p>
        <p className="truncate text-[11px] text-ink-soft">Inventario · Ventas · Fiados</p>
      </div>
    </div>
  );
}
