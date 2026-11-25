package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.inventario.TipoVenta;
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
@Table(name = "fiado")
public class Fiado extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "departamento_id", nullable = false)
    public Long departamentoId;

    @Column(name = "producto_id", nullable = false)
    public Long productoId;

    @Column(name = "nombre_producto", length = 150)
    public String nombreProducto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_venta", length = 10)
    public TipoVenta tipoVenta;

    @Column(precision = 12, scale = 3)
    public BigDecimal cantidad;

    @Column(name = "precio_unitario", precision = 12, scale = 2)
    public BigDecimal precioUnitario;

    @Column(name = "costo_unitario", precision = 12, scale = 2)
    public BigDecimal costoUnitario;

    @Column(precision = 12, scale = 2)
    public BigDecimal subtotal;

    @Column(nullable = false, length = 10)
    public String estado = "PENDIENTE";

    @Column(name = "usuario_id")
    public Long usuarioId;

    @Column(name = "creado_en")
    public Instant creadoEn = Instant.now();

    @Column(name = "pagado_en")
    public Instant pagadoEn;

    @Column(name = "pagado_por")
    public Long pagadoPor;
}
