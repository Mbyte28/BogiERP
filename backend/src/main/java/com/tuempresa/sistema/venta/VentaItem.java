package com.tuempresa.sistema.venta;

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

/** Línea de venta con snapshots: nunca se recalcula con el costo actual. */
@Entity
@Table(name = "venta_item")
public class VentaItem extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "venta_id", nullable = false)
    public Long ventaId;

    @Column(name = "producto_id", nullable = false)
    public Long productoId;

    @Column(name = "nombre_producto", nullable = false, length = 150)
    public String nombreProducto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_venta", nullable = false, length = 10)
    public TipoVenta tipoVenta;

    @Column(nullable = false, precision = 12, scale = 3)
    public BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 12, scale = 2)
    public BigDecimal precioUnitario;

    @Column(name = "costo_unitario", precision = 12, scale = 2)
    public BigDecimal costoUnitario;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal subtotal;
}
