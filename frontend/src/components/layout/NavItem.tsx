import { NavLink } from "react-router-dom";
import type { Modulo } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  modulo: Modulo;
  onNavigate?: () => void;
}

export function SidebarNavItem({ modulo, onNavigate }: SidebarNavItemProps) {
  const Icono = modulo.icono;

  return (
    <NavLink
      to={modulo.ruta}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-50 text-primary-600"
            : "text-ink-soft hover:bg-app hover:text-ink",
        )
      }
    >
      <Icono size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className="truncate">{modulo.nombre}</span>
    </NavLink>
  );
}
