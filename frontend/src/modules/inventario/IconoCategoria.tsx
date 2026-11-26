import {
  Apple,
  Banana,
  Beef,
  Beer,
  CakeSlice,
  Carrot,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Egg,
  Fish,
  GlassWater,
  Leaf,
  Milk,
  Package,
  Pizza,
  Salad,
  Sandwich,
  ShoppingBasket,
  Soup,
  SprayCan,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

export interface IconoCategoriaDefinicion {
  clave: string;
  etiqueta: string;
  Icono: LucideIcon;
}

/** Catálogo completo de iconos que se pueden asignar a una categoría. */
export const ICONOS_CATEGORIA: IconoCategoriaDefinicion[] = [
  { clave: "apple", etiqueta: "Manzana", Icono: Apple },
  { clave: "banana", etiqueta: "Plátano", Icono: Banana },
  { clave: "beef", etiqueta: "Carne", Icono: Beef },
  { clave: "beer", etiqueta: "Cerveza", Icono: Beer },
  { clave: "cake-slice", etiqueta: "Pastel", Icono: CakeSlice },
  { clave: "carrot", etiqueta: "Zanahoria", Icono: Carrot },
  { clave: "cherry", etiqueta: "Cereza", Icono: Cherry },
  { clave: "coffee", etiqueta: "Café", Icono: Coffee },
  { clave: "cookie", etiqueta: "Galleta", Icono: Cookie },
  { clave: "croissant", etiqueta: "Panadería", Icono: Croissant },
  { clave: "cup-soda", etiqueta: "Gaseosa", Icono: CupSoda },
  { clave: "egg", etiqueta: "Huevos", Icono: Egg },
  { clave: "fish", etiqueta: "Pescado", Icono: Fish },
  { clave: "glass-water", etiqueta: "Agua", Icono: GlassWater },
  { clave: "leaf", etiqueta: "Verduras", Icono: Leaf },
  { clave: "milk", etiqueta: "Lácteos", Icono: Milk },
  { clave: "package", etiqueta: "General", Icono: Package },
  { clave: "pizza", etiqueta: "Pizza", Icono: Pizza },
  { clave: "salad", etiqueta: "Ensalada", Icono: Salad },
  { clave: "sandwich", etiqueta: "Sandwich", Icono: Sandwich },
  { clave: "shopping-basket", etiqueta: "Compras", Icono: ShoppingBasket },
  { clave: "soup", etiqueta: "Sopa", Icono: Soup },
  { clave: "spray-can", etiqueta: "Limpieza", Icono: SprayCan },
  { clave: "utensils", etiqueta: "Alimentos", Icono: Utensils },
  { clave: "wine", etiqueta: "Vino", Icono: Wine },
];

const ICONOS: Record<string, LucideIcon> = Object.fromEntries(
  ICONOS_CATEGORIA.map(({ clave, Icono }) => [clave, Icono]),
);

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
