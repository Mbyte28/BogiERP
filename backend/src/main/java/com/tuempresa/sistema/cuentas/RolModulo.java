package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.security.Modulo;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "rol_modulo")
public class RolModulo extends PanacheEntityBase {

    @EmbeddedId
    public RolModuloId id;

    public RolModulo() {
    }

    public RolModulo(Long rolId, Modulo modulo) {
        this.id = new RolModuloId(rolId, modulo);
    }
}
