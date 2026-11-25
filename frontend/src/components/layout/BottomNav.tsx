import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { MODULOS, type ModuloKey } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarNavItem } from "./NavItem";

const CLAVES_PRINCIPALES: readonly ModuloKey[] = [
  "DASHBOARD",
  "VENTA",
  "INVENTARIO",
  "CAJA",
];

const principales = MODULOS.filter((modulo) =>
  CLAVES_PRINCIPALES.includes(modulo.key),
);
const extras = MODULOS.filter((modulo) => !CLAVES_PRINCIPALES.includes(modulo.key));

export function BottomNav() {
  const { pathname } = useLocation();
  const [masAbierto, setMasAbierto] = useState(false);
  const extrasActivo = extras.some(
    (modulo) => pathname === modulo.ruta || pathname.startsWith(`${modulo.ruta}/`),
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between px-2">
          {principales.map((modulo) => {
            const Icono = modulo.icono;
            const activo =
              pathname === modulo.ruta || pathname.startsWith(`${modulo.ruta}/`);
            return (
              <NavLink
                key={modulo.key}
                to={modulo.ruta}
                className={cn(
                  "flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold",
                  activo ? "text-primary-600" : "text-ink-soft",
                )}
              >
                <Icono size={20} strokeWidth={1.8} aria-hidden="true" />
                <span className="max-w-full truncate">{modulo.nombreCorto}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMasAbierto(true)}
            className={cn(
              "flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold",
              extrasActivo ? "text-primary-600" : "text-ink-soft",
            )}
            aria-label="Más opciones"
          >
            <MoreHorizontal size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      <Sheet open={masAbierto} onOpenChange={setMasAbierto}>
        <SheetContent side="bottom" title="Más opciones">
          <p className="text-base font-bold text-ink">Más opciones</p>
          <p className="mt-1 text-xs text-ink-soft">Módulos adicionales del sistema</p>
          <nav className="mt-5 grid gap-1" aria-label="Más opciones">
            {extras.map((modulo) => (
              <SidebarNavItem
                key={modulo.key}
                modulo={modulo}
                onNavigate={() => setMasAbierto(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
