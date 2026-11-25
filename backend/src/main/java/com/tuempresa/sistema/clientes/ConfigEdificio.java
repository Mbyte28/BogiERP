package com.tuempresa.sistema.clientes;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "config_edificio")
public class ConfigEdificio extends PanacheEntityBase {

    @Id
    public Short id;

    @Column(nullable = false)
    public Integer torres;

    @Column(name = "pisos_por_torre", nullable = false)
    public Integer pisosPorTorre;

    @Column(name = "deptos_por_piso", nullable = false)
    public Integer deptosPorPiso;

    @Column(name = "configurado_en", nullable = false)
    public Instant configuradoEn;
}
