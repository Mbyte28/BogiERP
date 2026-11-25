package com.tuempresa.sistema.caja;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "caja")
public class Caja extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "abierta_en", nullable = false)
    public Instant abiertaEn = Instant.now();

    @Column(name = "cerrada_en")
    public Instant cerradaEn;

    @Column(name = "abierta_por", nullable = false)
    public Long abiertaPor;

    @Column(name = "cerrada_por")
    public Long cerradaPor;
}
