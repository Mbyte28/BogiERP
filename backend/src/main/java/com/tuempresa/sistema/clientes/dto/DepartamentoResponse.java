package com.tuempresa.sistema.clientes.dto;

import java.math.BigDecimal;

public record DepartamentoResponse(
        Long id,
        int torre,
        int piso,
        int numero,
        String etiqueta,
        boolean conDeuda,
        long fiadosPendientes,
        BigDecimal totalPendiente) {
}
