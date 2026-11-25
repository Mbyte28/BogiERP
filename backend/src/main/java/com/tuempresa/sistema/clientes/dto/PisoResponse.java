package com.tuempresa.sistema.clientes.dto;

import java.math.BigDecimal;

public record PisoResponse(
        int piso,
        long departamentos,
        long departamentosConDeuda,
        BigDecimal totalPendiente) {
}
