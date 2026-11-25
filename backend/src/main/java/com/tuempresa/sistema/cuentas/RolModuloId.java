package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.security.Modulo;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RolModuloId implements Serializable {

    @Column(name = "rol_id", nullable = false)
    public Long rolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "modulo", nullable = false, length = 20)
    public Modulo modulo;

    public RolModuloId() {
    }

    public RolModuloId(Long rolId, Modulo modulo) {
        this.rolId = rolId;
        this.modulo = modulo;
    }

    @Override
    public boolean equals(Object otro) {
        if (this == otro) {
            return true;
        }
        if (!(otro instanceof RolModuloId that)) {
            return false;
        }
        return Objects.equals(rolId, that.rolId) && modulo == that.modulo;
    }

    @Override
    public int hashCode() {
        return Objects.hash(rolId, modulo);
    }
}
