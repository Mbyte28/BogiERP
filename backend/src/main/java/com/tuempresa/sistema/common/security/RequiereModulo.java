package com.tuempresa.sistema.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Exige que el usuario autenticado tenga permiso sobre alguno de los módulos indicados.
 * El rol principal siempre tiene acceso a todos los módulos.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface RequiereModulo {
    Modulo[] value();
}
