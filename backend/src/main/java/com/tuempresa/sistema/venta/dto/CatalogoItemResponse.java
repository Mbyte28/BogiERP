package com.tuempresa.sistema.venta.dto;

import com.tuempresa.sistema.inventario.TipoVenta;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CatalogoItemResponse(
        Long id,
        String nombre,
        String categoriaNombre,
        String categoriaIcono,
        String imagen,
        TipoVenta tipoVenta,
        BigDecimal precioVenta,
        BigDecimal stock,
        boolean sinCosto,
        Long diasVencimiento,
        BigDecimal cantidadVendida,
        boolean masVendido,
        LocalDate fechaVencimiento) {
}
