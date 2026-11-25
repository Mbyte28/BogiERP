import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { MODULOS, moduloPorRuta } from "@/lib/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Brand } from "./Brand";
import { SidebarNavItem } from "./NavItem";

export function Topbar() {
  const { pathname } = useLocation();
  const modulo = moduloPorRuta(pathname);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const titulo = modulo?.nombre ?? "Página no encontrada";
  const descripcion =
    modulo?.descripcion ?? "Revisa la dirección o vuelve al dashboard.";

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-app/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:min-h-20 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-soft outline-none transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary-500/40 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
            {titulo}
          </h1>
          <p className="hidden truncate text-xs text-ink-soft sm:block">{descripcion}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">Administrador</p>
            <p className="text-[11px] text-ink-soft">Rol principal</p>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600"
            aria-hidden="true"
          >
            AD
          </div>
        </div>
      </div>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left" title="Menú principal">
          <div className="px-2">
            <Brand />
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Menú principal móvil">
            {MODULOS.map((item) => (
              <SidebarNavItem
                key={item.key}
                modulo={item}
                onNavigate={() => setMenuAbierto(false)}
              />
            ))}
          </nav>
          <p className="mt-auto px-3 text-[11px] leading-relaxed text-ink-soft">
            Versión 0.1.0 · Estructura inicial
          </p>
        </SheetContent>
      </Sheet>
    </header>
  );
}
