package com.tuempresa.sistema.venta.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;

public record VentaItemResponse(
        Long id,
        Long productoId,
        String nombreProducto,
        TipoVenta tipoVenta,
        BigDecimal cantidad,
        BigDecimal precioUnitario,
        BigDecimal costoUnitario,
        BigDecimal subtotal,
        BigDecimal ganancia,
        boolean sinCosto) {
}
