package com.tuempresa.sistema.clientes.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;
import java.time.Instant;

public record FiadoResponse(
        Long id,
        Long departamentoId,
        Long productoId,
        String nombreProducto,
        TipoVenta tipoVenta,
        BigDecimal cantidad,
        BigDecimal precioUnitario,
        BigDecimal subtotal,
        String estado,
        Instant creadoEn,
        Instant pagadoEn) {
}
