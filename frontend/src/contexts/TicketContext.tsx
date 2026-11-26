import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { LineaTicket } from "@/lib/venta";

interface TicketContextValue {
  lineas: LineaTicket[];
  setLineas: Dispatch<SetStateAction<LineaTicket[]>>;
  limpiar: () => void;
}

const TicketContext = createContext<TicketContextValue | null>(null);

/**
 * Mantiene el ticket de venta mientras se navega entre módulos: VentaPage se
 * desmonta al cambiar de ruta, pero el carrito vive por encima del router.
 */
export function TicketProvider({ children }: { children: ReactNode }) {
  const [lineas, setLineas] = useState<LineaTicket[]>([]);

  const valor = useMemo<TicketContextValue>(
    () => ({ lineas, setLineas, limpiar: () => setLineas([]) }),
    [lineas],
  );

  return <TicketContext.Provider value={valor}>{children}</TicketContext.Provider>;
}

export function useTicket(): TicketContextValue {
  const contexto = useContext(TicketContext);
  if (!contexto) {
    throw new Error("useTicket debe usarse dentro de TicketProvider");
  }
  return contexto;
}
