package com.tuempresa.sistema.cuentas;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "rol")
public class Rol extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 60)
    public String nombre;

    @Column(name = "es_sistema", nullable = false)
    public boolean esSistema;

    @Column(name = "es_principal", nullable = false)
    public boolean esPrincipal;

    @Column(name = "creado_en", nullable = false)
    public Instant creadoEn = Instant.now();
}
