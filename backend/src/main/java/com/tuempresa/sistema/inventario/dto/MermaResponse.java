package com.tuempresa.sistema.inventario.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record MermaResponse(
        Long id,
        Long productoId,
        String productoNombre,
        BigDecimal cantidad,
        BigDecimal costoUnitario,
        BigDecimal total,
        String motivo,
        Instant creadoEn,
        Long usuarioId) {
}
