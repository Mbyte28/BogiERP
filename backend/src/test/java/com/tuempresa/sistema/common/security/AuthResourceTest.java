package com.tuempresa.sistema.common.security;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import jakarta.ws.rs.core.MediaType;
import org.junit.jupiter.api.Test;

@QuarkusTest
public class AuthResourceTest {

    private static final String COOKIE = "access_token";

    @Test
    void loginConCredencialesCorrectasDevuelveSesionYCookie() {
        Response respuesta = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "admin", "password": "admin123"}
                        """)
                .post("/auth/login");

        respuesta.then()
                .statusCode(200)
                .body("username", equalTo("admin"))
                .body("rol", equalTo("PRINCIPAL"))
                .body("principal", equalTo(true))
                .body("modulos", hasItem("CUENTAS"));

        String token = respuesta.getCookie(COOKIE);
        org.junit.jupiter.api.Assertions.assertNotNull(token);
        org.junit.jupiter.api.Assertions.assertFalse(token.isBlank());
    }

    @Test
    void loginConContrasenaIncorrectaDevuelve401() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "admin", "password": "incorrecta"}
                        """)
                .post("/auth/login")
                .then()
                .statusCode(401)
                .body("message", containsString("incorrectos"));
    }

    @Test
    void meSinCookieDevuelve401() {
        given()
                .get("/auth/me")
                .then()
                .statusCode(401);
    }

    @Test
    void meConCookieDevuelveLaSesionActual() {
        String token = iniciarSesion("admin", "admin123");

        given()
                .cookie(COOKIE, token)
                .get("/auth/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("admin"))
                .body("principal", equalTo(true))
                .body("modulos", notNullValue());
    }

    @Test
    void logoutBorraLaCookie() {
        String token = iniciarSesion("admin", "admin123");

        Response respuesta = given()
                .cookie(COOKIE, token)
                .post("/auth/logout");

        respuesta.then().statusCode(204);
        org.junit.jupiter.api.Assertions.assertEquals(0, respuesta.getDetailedCookie(COOKIE).getMaxAge());
    }

    public static String iniciarSesion(String username, String password) {
        Response respuesta = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"username\": \"" + username + "\", \"password\": \"" + password + "\"}")
                .post("/auth/login");

        respuesta.then().statusCode(200);
        String token = respuesta.getCookie(COOKIE);
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("El login no devolvió la cookie de sesión");
        }
        return token;
    }
}
