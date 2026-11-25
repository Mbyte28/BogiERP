package com.tuempresa.sistema.inventario;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "merma")
public class Merma extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "producto_id", nullable = false)
    public Long productoId;

    @Column(nullable = false, precision = 12, scale = 3)
    public BigDecimal cantidad;

    @Column(name = "costo_unitario", precision = 12, scale = 2)
    public BigDecimal costoUnitario;

    @Column(nullable = false, length = 100)
    public String motivo;

    @Column(name = "usuario_id")
    public Long usuarioId;

    @Column(name = "creado_en", nullable = false)
    public Instant creadoEn = Instant.now();
}
