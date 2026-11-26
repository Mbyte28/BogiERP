package com.tuempresa.sistema.common;

import io.agroal.api.AgroalDataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Devuelve a TRABAJADOR los usuarios con roles creados por los tests y borra esos
 * roles. Así el límite de seis roles no se acumula entre pruebas y no se pierden
 * las ventas ni los movimientos que referencian a esos usuarios.
 */
public final class RolesDePrueba {

    private RolesDePrueba() {
    }

    public static void limpiar(AgroalDataSource dataSource) {
        try (Connection conexion = dataSource.getConnection();
                Statement sentencia = conexion.createStatement()) {
            sentencia.executeUpdate("""
                    update usuario
                       set rol_id = (select id from rol where nombre = 'TRABAJADOR')
                     where rol_id in (select id from rol where es_sistema = false)
                    """);
            sentencia.executeUpdate("delete from rol where es_sistema = false");
        } catch (SQLException fallo) {
            throw new IllegalStateException("No se pudieron limpiar los roles de prueba", fallo);
        }
    }
}
