import {
  Apple,
  Beef,
  Cookie,
  Croissant,
  CupSoda,
  Milk,
  Package,
  SprayCan,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const ICONOS: Record<string, LucideIcon> = {
  apple: Apple,
  beef: Beef,
  cookie: Cookie,
  croissant: Croissant,
  "cup-soda": CupSoda,
  milk: Milk,
  package: Package,
  "spray-can": SprayCan,
  utensils: Utensils,
};

export function IconoCategoria({
  nombre,
  size = 16,
}: {
  nombre: string | null | undefined;
  size?: number;
}) {
  const Icono = ICONOS[nombre ?? ""] ?? Package;
  return <Icono size={size} strokeWidth={1.8} aria-hidden="true" />;
}
