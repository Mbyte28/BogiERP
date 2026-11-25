package com.tuempresa.sistema.common.security;

import com.tuempresa.sistema.common.error.Errores;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    AuthService auth;

    @Inject
    JsonWebToken jwt;

    @ConfigProperty(name = "app.auth.cookie-name", defaultValue = "access_token")
    String cookieName;

    @ConfigProperty(name = "app.auth.cookie-secure", defaultValue = "false")
    boolean cookieSecure;

    @ConfigProperty(name = "app.auth.token-hours", defaultValue = "8")
    int tokenHours;

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response login(@Valid LoginRequest solicitud) {
        AuthResult resultado = auth.autenticar(solicitud);
        return Response.ok(resultado.sesion())
                .cookie(cookieSesion(resultado.token(), tokenHours * 3600))
                .build();
    }

    @GET
    @Path("/me")
    @io.quarkus.security.Authenticated
    public SesionResponse me() {
        String subject = jwt.getSubject();
        if (subject == null) {
            throw Errores.unauthorized("La sesión no es válida");
        }
        try {
            return auth.sesionActual(Long.valueOf(subject));
        } catch (NumberFormatException ex) {
            throw Errores.unauthorized("La sesión no es válida");
        }
    }

    @POST
    @Path("/logout")
    public Response logout() {
        return Response.noContent()
                .cookie(cookieSesion("", 0))
                .build();
    }

    private NewCookie cookieSesion(String valor, int maxAge) {
        return new NewCookie.Builder(cookieName)
                .value(valor)
                .path("/")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(NewCookie.SameSite.LAX)
                .maxAge(maxAge)
                .build();
    }
}
