package com.tuempresa.sistema.historial.dto;

import com.tuempresa.sistema.caja.dto.CajaResumenResponse;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import java.util.List;

public record HistorialCajaDetalleResponse(
        CajaResumenResponse resumen,
        List<VentaResponse> ventas) {
}
