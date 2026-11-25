import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { modulosVisibles } from "@/lib/auth";
import { moduloPorRuta } from "@/lib/navigation";
import { Brand } from "./Brand";
import { SidebarNavItem } from "./NavItem";

export function Topbar() {
  const { sesion, cerrarSesion } = useAuth();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const modulo = moduloPorRuta(pathname);
  const modulos = modulosVisibles(sesion);

  const titulo = modulo?.nombre ?? "Página no encontrada";
  const descripcion =
    modulo?.descripcion ?? "Revisa la dirección o vuelve al dashboard.";
  const iniciales = sesion?.username.slice(0, 2).toUpperCase() ?? "--";

  async function alCerrarSesion() {
    await cerrarSesion();
    navegar("/login", { replace: true });
  }

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

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">
              {sesion?.username ?? "Usuario"}
            </p>
            <p className="text-[11px] text-ink-soft">{sesion?.rol ?? ""}</p>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600"
            aria-hidden="true"
          >
            {iniciales}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={alCerrarSesion}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut />
          </Button>
        </div>
      </div>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left" title="Menú principal">
          <div className="px-2">
            <Brand />
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Menú principal móvil">
            {modulos.map((item) => (
              <SidebarNavItem
                key={item.key}
                modulo={item}
                onNavigate={() => setMenuAbierto(false)}
              />
            ))}
          </nav>
          <div className="mt-auto pt-4">
            <p className="px-3 text-[11px] leading-relaxed text-ink-soft">
              {sesion?.username} · {sesion?.rol}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={alCerrarSesion}
            >
              <LogOut />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
