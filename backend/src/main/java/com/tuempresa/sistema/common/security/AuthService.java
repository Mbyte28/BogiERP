package com.tuempresa.sistema.common.security;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.cuentas.RolModuloRepository;
import com.tuempresa.sistema.cuentas.Usuario;
import com.tuempresa.sistema.cuentas.UsuarioRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class AuthService {

    @Inject
    UsuarioRepository usuarios;

    @Inject
    RolModuloRepository modulos;

    @ConfigProperty(name = "app.auth.token-hours", defaultValue = "8")
    int tokenHours;

    @Transactional
    public AuthResult autenticar(LoginRequest solicitud) {
        Usuario usuario = usuarios.buscarPorUsername(solicitud.username().trim())
                .orElseThrow(() -> Errores.unauthorized("Usuario o contraseña incorrectos"));

        if (!usuario.activo || !BcryptUtil.matches(solicitud.password(), usuario.passwordHash)) {
            throw Errores.unauthorized("Usuario o contraseña incorrectos");
        }

        List<String> asignados = nombresModulos(usuario);
        String token = Jwt.issuer("sistema")
                .subject(String.valueOf(usuario.id))
                .upn(usuario.username)
                .claim("rol", usuario.rol.nombre)
                .claim("principal", usuario.rol.esPrincipal)
                .claim("modulos", asignados)
                .expiresIn(Duration.ofHours(tokenHours))
                .sign();

        return new AuthResult(token, aSesion(usuario, asignados));
    }

    @Transactional
    public SesionResponse sesionActual(Long usuarioId) {
        Usuario usuario = usuarios.findByIdOptional(usuarioId)
                .orElseThrow(() -> Errores.unauthorized("La sesión ya no es válida"));

        if (!usuario.activo) {
            throw Errores.unauthorized("El usuario está desactivado");
        }

        return aSesion(usuario, nombresModulos(usuario));
    }

    private List<String> nombresModulos(Usuario usuario) {
        return modulos.modulosDe(usuario.rol.id).stream().map(Modulo::name).toList();
    }

    private SesionResponse aSesion(Usuario usuario, List<String> asignados) {
        return new SesionResponse(
                usuario.id,
                usuario.username,
                usuario.rol.nombre,
                usuario.rol.esPrincipal,
                asignados);
    }
}
