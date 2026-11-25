package com.tuempresa.sistema.venta.dto;

import com.tuempresa.sistema.venta.MedioTransferencia;
import com.tuempresa.sistema.venta.MetodoPago;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record VentaResponse(
        Long id,
        Long cajaId,
        MetodoPago metodoPago,
        BigDecimal total,
        BigDecimal montoEfectivo,
        BigDecimal montoTransferencia,
        BigDecimal efectivoRecibido,
        BigDecimal vuelto,
        MedioTransferencia medioTransferencia,
        Instant creadoEn,
        List<VentaItemResponse> items) {
}
