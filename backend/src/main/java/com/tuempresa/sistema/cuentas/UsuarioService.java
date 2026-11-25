package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.cuentas.dto.CrearUsuarioRequest;
import com.tuempresa.sistema.cuentas.dto.UsuarioResponse;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;

@ApplicationScoped
public class UsuarioService {

    @Inject
    UsuarioRepository usuarios;

    @Inject
    RolRepository roles;

    @Transactional
    public List<UsuarioResponse> listar() {
        return usuarios.listarConRol().stream().map(this::aRespuesta).toList();
    }

    @Transactional
    public UsuarioResponse crear(CrearUsuarioRequest solicitud) {
        String username = solicitud.username().trim();

        if (usuarios.existeUsername(username)) {
            throw Errores.conflict("Ya existe un usuario con ese nombre");
        }

        Rol rol = roles.findByIdOptional(solicitud.rolId())
                .orElseThrow(() -> Errores.notFound("El rol seleccionado no existe"));

        Instant ahora = Instant.now();
        Usuario usuario = new Usuario();
        usuario.username = username;
        usuario.passwordHash = BcryptUtil.bcryptHash(solicitud.password());
        usuario.rol = rol;
        usuario.activo = true;
        usuario.creadoEn = ahora;
        usuario.actualizadoEn = ahora;
        usuario.persist();

        return aRespuesta(usuario);
    }

    private UsuarioResponse aRespuesta(Usuario usuario) {
        return new UsuarioResponse(
                usuario.id,
                usuario.username,
                usuario.rol.nombre,
                usuario.rol.esPrincipal,
                usuario.activo,
                usuario.creadoEn);
    }
}
