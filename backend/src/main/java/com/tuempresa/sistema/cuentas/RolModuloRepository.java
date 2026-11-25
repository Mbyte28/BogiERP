package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.security.Modulo;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class RolModuloRepository implements PanacheRepository<RolModulo> {

    public Set<Modulo> modulosDe(Long rolId) {
        Set<Modulo> modulos = EnumSet.noneOf(Modulo.class);
        find("id.rolId", rolId).list().forEach(rm -> modulos.add(rm.id.modulo));
        return modulos;
    }

    public Map<Long, Set<Modulo>> modulosPorRol() {
        Map<Long, Set<Modulo>> mapa = new HashMap<>();
        for (RolModulo rm : listAll()) {
            mapa.computeIfAbsent(rm.id.rolId, clave -> EnumSet.noneOf(Modulo.class)).add(rm.id.modulo);
        }
        return mapa;
    }

    public void reemplazar(Long rolId, Set<Modulo> modulos) {
        delete("id.rolId", rolId);
        if (modulos == null) {
            return;
        }
        for (Modulo modulo : modulos) {
            persist(new RolModulo(rolId, modulo));
        }
    }
}
