package com.tuempresa.sistema.inventario;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "producto")
public class Producto extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 150)
    public String nombre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    public Categoria categoria;

    @Column(length = 255)
    public String imagen;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_venta", nullable = false, length = 10)
    public TipoVenta tipoVenta;

    @Column(name = "precio_venta", nullable = false, precision = 12, scale = 2)
    public BigDecimal precioVenta;

    @Column(name = "costo_actual", precision = 12, scale = 2)
    public BigDecimal costoActual;

    @Column(nullable = false, precision = 12, scale = 3)
    public BigDecimal stock = BigDecimal.ZERO;

    @Column(name = "fecha_vencimiento")
    public LocalDate fechaVencimiento;

    @Column(nullable = false)
    public boolean activo = true;

    @Column(name = "creado_en", nullable = false)
    public Instant creadoEn = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    public Instant actualizadoEn = Instant.now();
}
