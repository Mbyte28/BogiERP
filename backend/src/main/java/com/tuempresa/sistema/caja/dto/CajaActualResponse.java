package com.tuempresa.sistema.caja.dto;

public record CajaActualResponse(
        boolean abierta,
        CajaResumenResponse caja) {
}
