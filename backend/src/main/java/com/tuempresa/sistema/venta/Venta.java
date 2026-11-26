package com.tuempresa.sistema.venta;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "venta")
public class Venta extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "caja_id", nullable = false)
    public Long cajaId;

    @Column(name = "usuario_id", nullable = false)
    public Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 15)
    public MetodoPago metodoPago;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal total;

    @Column(name = "monto_efectivo", nullable = false, precision = 12, scale = 2)
    public BigDecimal montoEfectivo;

    @Column(name = "monto_transferencia", nullable = false, precision = 12, scale = 2)
    public BigDecimal montoTransferencia;

    @Column(name = "efectivo_recibido", precision = 12, scale = 2)
    public BigDecimal efectivoRecibido;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal vuelto;

    @Enumerated(EnumType.STRING)
    @Column(name = "medio_transferencia", length = 10)
    public MedioTransferencia medioTransferencia;

    /** Venta generada al pagar un envío; NULL en ventas de mostrador. */
    @Column(name = "fiado_id")
    public Long fiadoId;

    @Column(name = "creado_en", nullable = false)
    public Instant creadoEn = Instant.now();
}
