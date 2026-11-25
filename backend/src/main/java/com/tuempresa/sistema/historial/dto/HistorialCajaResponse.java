package com.tuempresa.sistema.historial.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record HistorialCajaResponse(
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
        long itemsSinCosto) {
}
