package com.tuempresa.sistema.clientes.dto;

public record ConfigEdificioResponse(
        boolean configurado,
        Integer torres,
        Integer pisosPorTorre,
        Integer deptosPorPiso,
        long totalDepartamentos) {
}
