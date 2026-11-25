package com.tuempresa.sistema.inventario.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ProductoResponse(
        Long id,
        String nombre,
        Long categoriaId,
        String categoriaNombre,
        String categoriaIcono,
        String imagen,
        TipoVenta tipoVenta,
        BigDecimal precioVenta,
        BigDecimal costoActual,
        BigDecimal stock,
        LocalDate fechaVencimiento,
        boolean activo,
        boolean sinCosto,
        Long diasVencimiento,
        Instant creadoEn) {
}
