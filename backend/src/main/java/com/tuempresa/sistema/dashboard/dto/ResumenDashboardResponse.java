package com.tuempresa.sistema.dashboard.dto;

import java.math.BigDecimal;

public record ResumenDashboardResponse(
        BigDecimal ventas,
        BigDecimal ganancia,
        BigDecimal merma,
        BigDecimal gananciaNeta,
        BigDecimal unidades,
        BigDecimal kilos,
        long itemsSinCosto,
        long lineas,
        String desde,
        String hasta) {
}
