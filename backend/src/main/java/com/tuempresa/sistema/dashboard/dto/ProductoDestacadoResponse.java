package com.tuempresa.sistema.dashboard.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;

public record ProductoDestacadoResponse(
        Long productoId,
        String nombre,
        TipoVenta tipoVenta,
        String imagen,
        String categoriaIcono,
        BigDecimal cantidad,
        BigDecimal ventas,
        BigDecimal ganancia) {
}
