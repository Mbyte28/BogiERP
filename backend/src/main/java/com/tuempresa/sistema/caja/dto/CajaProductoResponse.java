package com.tuempresa.sistema.caja.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;

public record CajaProductoResponse(
        Long productoId,
        String nombreProducto,
        TipoVenta tipoVenta,
        BigDecimal cantidadTotal,
        BigDecimal ventasTotal,
        BigDecimal ganancia,
        boolean tieneItemsSinCosto) {
}
