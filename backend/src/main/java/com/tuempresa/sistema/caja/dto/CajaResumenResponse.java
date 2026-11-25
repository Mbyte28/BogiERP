package com.tuempresa.sistema.caja.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CajaResumenResponse(
        Long cajaId,
        Instant abiertaEn,
        Instant cerradaEn,
        boolean abierta,
        long totalVentas,
        BigDecimal totalDinero,
        BigDecimal totalEfectivo,
        BigDecimal totalTransferencia,
        BigDecimal totalUnidades,
        BigDecimal totalKilos,
        long totalLineas,
        BigDecimal ganancia,
        long itemsSinCosto,
        List<CajaProductoResponse> productos) {
}
