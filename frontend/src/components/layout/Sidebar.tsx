import { useAuth } from "@/contexts/AuthContext";
import { modulosVisibles } from "@/lib/auth";
import { Brand } from "./Brand";
import { SidebarNavItem } from "./NavItem";

export function Sidebar() {
  const { sesion } = useAuth();
  const modulos = modulosVisibles(sesion);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line/70 bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Brand />
      </div>

      <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
        Menú
      </p>
      <nav className="mt-3 flex flex-col gap-1" aria-label="Menú principal">
        {modulos.map((modulo) => (
          <SidebarNavItem key={modulo.key} modulo={modulo} />
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-app p-4">
        <p className="text-xs font-semibold text-ink">Sistema interno</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
          Versión 0.1.0 · Módulo de cuentas
        </p>
      </div>
    </aside>
  );
}
