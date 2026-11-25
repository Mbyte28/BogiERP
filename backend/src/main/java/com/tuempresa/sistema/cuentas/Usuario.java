package com.tuempresa.sistema.cuentas;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "usuario")
public class Usuario extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 60)
    public String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    public String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rol_id", nullable = false)
    public Rol rol;

    @Column(nullable = false)
    public boolean activo = true;

    @Column(name = "creado_en", nullable = false)
    public Instant creadoEn = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    public Instant actualizadoEn = Instant.now();
}
