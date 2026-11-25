package com.tuempresa.sistema.clientes.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;

public record ProductoFiadoResponse(
        Long id,
        String nombre,
        TipoVenta tipoVenta,
        BigDecimal precioVenta,
        BigDecimal stock) {
}
