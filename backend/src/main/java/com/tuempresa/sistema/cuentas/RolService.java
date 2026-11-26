package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.cuentas.dto.ActualizarModulosRequest;
import com.tuempresa.sistema.cuentas.dto.CrearRolRequest;
import com.tuempresa.sistema.cuentas.dto.RolResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class RolService {

    private static final long MAXIMO_ROLES = 6;

    @Inject
    RolRepository roles;

    @Inject
    RolModuloRepository modulos;

    @Transactional
    public List<RolResponse> listar() {
        Map<Long, Set<Modulo>> asignados = modulos.modulosPorRol();
        return roles.listarOrdenados().stream()
                .map(rol -> aRespuesta(rol, asignados.getOrDefault(rol.id, Set.of())))
                .toList();
    }

    @Transactional
    public RolResponse crear(CrearRolRequest solicitud) {
        String nombre = solicitud.nombre().trim();
        if (roles.existeNombre(nombre)) {
            throw Errores.conflict("Ya existe un rol con ese nombre");
        }
        if (roles.contarNoPrincipales() >= MAXIMO_ROLES) {
            throw Errores.conflict(
                    "Máximo " + MAXIMO_ROLES + " roles permitidos (sin contar el principal)");
        }

        Set<Modulo> seleccionados = modulosValidos(solicitud.modulos());

        Rol rol = new Rol();
        rol.nombre = nombre;
        rol.esSistema = false;
        rol.esPrincipal = false;
        rol.persist();

        if (!seleccionados.isEmpty()) {
            modulos.reemplazar(rol.id, seleccionados);
        }

        return aRespuesta(rol, seleccionados);
    }

    @Transactional
    public RolResponse actualizarModulos(Long rolId, ActualizarModulosRequest solicitud) {
        Rol rol = roles.findByIdOptional(rolId)
                .orElseThrow(() -> Errores.notFound("El rol no existe"));

        if (rol.esPrincipal) {
            throw Errores.badRequest("El rol principal conserva todos los módulos");
        }

        Set<Modulo> seleccionados = modulosValidos(solicitud.modulos());
        modulos.reemplazar(rol.id, seleccionados);
        return aRespuesta(rol, seleccionados);
    }

    private Set<Modulo> modulosValidos(Set<Modulo> solicitados) {
        Set<Modulo> seleccionados = EnumSet.noneOf(Modulo.class);
        if (solicitados != null) {
            seleccionados.addAll(solicitados);
        }
        if (seleccionados.contains(Modulo.CUENTAS)) {
            throw Errores.badRequest("El módulo CUENTAS solo pertenece al rol principal");
        }
        return seleccionados;
    }

    private RolResponse aRespuesta(Rol rol, Set<Modulo> asignados) {
        return new RolResponse(
                rol.id,
                rol.nombre,
                rol.esSistema,
                rol.esPrincipal,
                new ArrayList<>(asignados));
    }
}
