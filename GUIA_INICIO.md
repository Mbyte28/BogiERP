# Guía de inicio: levantar la base de datos, el backend y el frontend

Esta guía explica cómo poner en marcha los tres contenedores del proyecto y abrir
la aplicación en el navegador. Todo el tráfico entra por el contenedor
`frontend` (Nginx): la interfaz en `http://localhost` y la API en
`http://localhost/api`. El backend no se expone directamente.

---

## 1. Requisitos

- Docker Desktop con Compose v2. Verificar:

  ```powershell
  docker --version
  docker compose version
  ```

- Git para clonar el repositorio.
- `openssl` para generar las llaves JWT. En Windows viene con Git
  (`C:\Program Files\Git\usr\bin\openssl.exe`); el script lo busca solo.
- Puertos libres:
  - `80` → interfaz web (Nginx).
  - `5432` → PostgreSQL (solo en local; en producción se cierra).
  - El backend escucha en `8080` **dentro** de la red de Docker, no en el host.

---

## 2. Preparación (una sola vez)

Ejecuta los comandos desde la raíz del repositorio.

### 2.1 Crear el archivo `.env`

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

El archivo `.env` **no se versiona**. Revisa estos valores:

| Variable | Para qué sirve | Valor del ejemplo |
|---|---|---|
| `POSTGRES_DB` | Nombre de la base de datos | `sistema` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `sistema` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `cambia_esto` |
| `POSTGRES_PORT` | Puerto publicado de la BD en local | `5432` |
| `TZ` | Zona horaria de los contenedores | `America/Lima` |
| `ADMIN_USERNAME` | Usuario principal que crea el backend | `admin` |
| `ADMIN_PASSWORD` | Contraseña de ese usuario en contenedores | `cambia_esto_tambien` |
| `JWT_KEYS_DIR` | Carpeta con las llaves JWT | `./backend/keys` |
| `APP_AUTH_COOKIE_SECURE` | `false` en HTTP local; `true` solo con HTTPS | `false` |

> Si cambias `POSTGRES_PASSWORD` **después** de crear el volumen `pgdata`, la
> base sigue con la contraseña original (PostgreSQL solo la aplica al crear el
> volumen). Usa una contraseña definitiva antes del primer arranque o recrea el
> volumen con `docker compose down -v` (⚠️ borra los datos).

### 2.2 Generar las llaves JWT

```powershell
.\scripts\generate-jwt-keys.ps1
```

```bash
./scripts/generate-jwt-keys.sh
```

Deben existir `backend/keys/privateKey.pem` y `backend/keys/publicKey.pem`.
Sin ellas el backend no puede iniciar. Estas llaves **no se versionan**.

---

## 3. Opción A: levantar los tres contenedores (forma normal)

```powershell
docker compose up -d --build
```

```bash
docker compose up -d --build
```

Este único comando:

1. Construye la imagen del **backend** (Maven + JDK 21).
2. Construye la imagen del **frontend** (Node 22 para compilar y Nginx para servir).
3. Inicia PostgreSQL con la imagen `postgres:16-alpine` y crea el volumen `pgdata`.
4. Espera a que la BD esté sana (`healthy`) antes de arrancar el backend.
5. El backend aplica la migración de Flyway (tablas, roles, permisos y categorías)
   y crea el usuario principal si la tabla `usuario` está vacía.
6. Nginx publica la web en el puerto `80` y redirige `/api` al backend.

La primera vez tarda varios minutos por la descarga y compilación de imágenes.

### 3.1 Comprobar que arrancó

```powershell
docker compose ps
```

Los tres servicios deben aparecer activos; `db` con estado `(healthy)`.

```powershell
docker compose logs -f backend
```

Espera a ver `started in ...` y, si es la primera vez, `Usuario principal inicial
creado: admin`. Sale de los logs con `Ctrl + C`.

```powershell
curl.exe http://localhost/api/q/health
```

Debe responder con `"status":"UP"`.

### 3.2 Abrir la aplicación en el navegador

Entra a **http://localhost**. Aparece la pantalla de login.

- Usuario: el valor de `ADMIN_USERNAME` en `.env` (`admin` por defecto).
- Contraseña: el valor de `ADMIN_PASSWORD` en `.env`
  (`cambia_esto_tambien` por defecto en contenedores).

Si la base ya tenía usuarios de una sesión anterior, el backend **no crea otro**
usuario principal: entra con uno existente o crea uno desde el módulo Cuentas.

### 3.3 URLs útiles

| URL | Qué muestra |
|---|---|
| `http://localhost` | Aplicación (interfaz web) |
| `http://localhost/api/q/health` | Estado del backend |
| `http://localhost/api/q/swagger-ui` | Documentación de la API (solo si el backend corre en perfil `dev`) |
| `localhost:5432` | PostgreSQL en local (no se publica en producción) |

### 3.4 Comandos de uso diario

```powershell
docker compose logs -f frontend          # ver logs de Nginx
docker compose restart backend           # reiniciar solo el backend
docker compose down                      # detener; CONSERVA la BD y las imágenes
docker compose down -v                   # ⚠️ detiene y BORRA la BD y las imágenes
docker compose exec db psql -U sistema -d sistema   # consola de PostgreSQL
```

Los datos viven en dos volúmenes que sobreviven a `docker compose down`:

- `pgdata` → base de datos.
- `uploads` → fotos de productos (el backend escribe, Nginx lee).

---

## 4. Crear solo el contenedor de la base de datos

Con Compose:

```powershell
docker compose up -d db
```

Esto crea el volumen `pgdata` y publica PostgreSQL en `localhost:5432`.
Para comprobarlo:

```powershell
docker compose exec db pg_isready -U sistema -d sistema
docker compose exec -it db psql -U sistema -d sistema
```

### Si prefieres crear la BD sin Compose

Útil, por ejemplo, cuando no se puede descargar `postgres:16-alpine` pero ya
tienes otra imagen de PostgreSQL en local:

```powershell
docker run -d --name erp-db `
  -e POSTGRES_DB=sistema `
  -e POSTGRES_USER=sistema `
  -e POSTGRES_PASSWORD=cambia_esto `
  -e TZ=America/Lima `
  -p 5432:5432 `
  -v erp-pgdata:/var/lib/postgresql/data `
  postgres:17-alpine
```

```bash
docker run -d --name erp-db \
  -e POSTGRES_DB=sistema \
  -e POSTGRES_USER=sistema \
  -e POSTGRES_PASSWORD=cambia_esto \
  -e TZ=America/Lima \
  -p 5432:5432 \
  -v erp-pgdata:/var/lib/postgresql/data \
  postgres:17-alpine
```

Verificación:

```powershell
docker exec erp-db pg_isready -U sistema -d sistema
```

> Usa **uno** de los dos métodos a la vez: si el contenedor manual `erp-db`
> ocupa el puerto `5432`, `docker compose up` no podrá publicar la BD. Para
> volver a Compose: `docker rm -f erp-db`.

---

## 5. Opción B: desarrollo con recarga en caliente (opcional)

Aquí solo la BD corre en Docker; el backend y el frontend corren en tu equipo y
se recargan al guardar cambios.

```powershell
# Terminal 1: base de datos
docker compose up -d db

# Terminal 2: API en http://localhost:8080
cd backend
.\mvnw.cmd quarkus:dev

# Terminal 3: web en http://localhost:5173
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. El servidor de Vite redirige `/api` y `/uploads`
a `http://localhost:8080`, así que la aplicación se comporta igual que detrás de
Nginx. Swagger UI sí está disponible en
`http://localhost:8080/api/q/swagger-ui` porque el backend usa el perfil `dev`.

En este modo el usuario principal se crea con `admin` / `admin123` si no
definiste `ADMIN_PASSWORD`. Si cambiaste las credenciales en `.env`, expórtalas
antes de arrancar Quarkus:

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="cambia_esto_tambien"
$env:QUARKUS_DATASOURCE_JDBC_URL="jdbc:postgresql://localhost:5432/sistema"
$env:QUARKUS_DATASOURCE_USERNAME="sistema"
$env:QUARKUS_DATASOURCE_PASSWORD="cambia_esto"
```

En Linux/macOS usa `export NOMBRE=valor` en lugar de `$env:NOMBRE="valor"`.

---

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `authentication required - incorrect username or password` al descargar imágenes | Docker Hub requiere inicio de sesión | Ejecuta `docker login` con una cuenta válida. Para el desarrollo local también puedes usar el contenedor manual de la sección 4 con una imagen ya descargada. |
| `http://localhost` no abre | El contenedor `frontend` no arrancó o el puerto 80 está ocupado | `docker compose ps` y `docker compose logs frontend`. Si el puerto está ocupado, cambia `"80:80"` por `"8081:80"` en `docker-compose.yml` y abre `http://localhost:8081`. |
| El backend no arranca | Faltan las llaves JWT o la BD no está `healthy` | Verifica `backend/keys/*.pem` y `docker compose logs backend`. |
| La web carga pero el login devuelve 401 | Contraseña distinta o cookie marcada como segura | Confirma `ADMIN_PASSWORD` de `.env` y deja `APP_AUTH_COOKIE_SECURE=false` cuando entras por HTTP. |
| Los cambios en la contraseña de la BD no surten efecto | El volumen `pgdata` ya existía | Recrea el volumen con `docker compose down -v` (⚠️ pierde los datos) o cambia la contraseña dentro de PostgreSQL con `ALTER USER`. |
| Olvidé la contraseña del usuario principal | No hay recuperación automática | Si tienes sesión activa, crea otro usuario desde Cuentas. Si no, hay que recrear la base con `docker compose down -v` (⚠️ pierde los datos). |

---

## 7. Comprobación rápida

- [ ] `docker compose ps` muestra `db`, `backend` y `frontend` activos.
- [ ] `curl.exe http://localhost/api/q/health` responde `"status":"UP"`.
- [ ] `http://localhost` muestra la pantalla de login.
- [ ] El login entra con el usuario de `.env`.
- [ ] Se puede crear un producto en Inventario y verlo en Venta y en el Dashboard.

Para desplegar en un VPS con HTTPS y backups, consulta la sección
"Producción (Hetzner)" de `README.md`.
