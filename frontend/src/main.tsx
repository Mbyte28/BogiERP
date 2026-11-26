import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { crearQueryClient } from "@/lib/queryClient";
import App from "./App";
import "./index.css";

const queryClient = crearQueryClient();

const contenedor = document.getElementById("root");
if (!contenedor) {
  throw new Error("No se encontró el elemento #root");
}

createRoot(contenedor).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TicketProvider>
          <App />
        </TicketProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
