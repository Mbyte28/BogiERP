# Sistema de Inventario, Ventas y Fiados

ERP para una tienda dentro de un condominio: inventario con costos y mermas,
ventas con caja, fiados por departamento y dashboard de ganancias.

Monorepo con tres contenedores:

- **frontend** — React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Nginx).
- **backend** — Quarkus 3 + Java 21 + Panache + Flyway + JWT.
- **db** — PostgreSQL 16.

Todo el tráfico entra por el contenedor `frontend` (Nginx), que sirve la SPA,
redirige `/api` al backend y publica `/uploads` desde el volumen compartido.

---

## Requisitos

- Docker Desktop con Compose v2
- Git
- Opcional para desarrollo sin Docker: JDK 21, Node.js 22+ y `openssl`

---

## Puesta en marcha

```bash
# 1. Variables de entorno locales
cp .env.example .env          # PowerShell: Copy-Item .env.example .env

# 2. Llaves JWT (no se versionan)
./scripts/generate-jwt-keys.sh    # Windows: .\scripts\generate-jwt-keys.ps1

# 3. Levantar los tres contenedores
docker compose up -d --build
```

La aplicación queda en **http://localhost**. Flyway crea el esquema y los datos
iniciales (roles, permisos y categorías) en el primer arranque del backend.

Servicios útiles:

| URL | Descripción |
|---|---|
| `http://localhost` | Aplicación |
| `http://localhost/api/q/health` | Salud del backend |
| `http://localhost/api/q/swagger-ui` | Swagger UI (solo perfil dev) |
| `localhost:5432` | PostgreSQL (solo local; en producción no se publica) |

---

## Desarrollo con recarga en caliente

```bash
docker compose up -d db

# Terminal 1
cd backend
./mvnw quarkus:dev            # Windows: .\mvnw.cmd quarkus:dev

# Terminal 2
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

> En Linux/macOS, si `backend/mvnw` no tiene permiso de ejecución, ejecuta
> `chmod +x backend/mvnw` una sola vez.

Vite proxya `/api` y `/uploads` hacia `http://localhost:8080`, así que el
frontend se comporta igual que detrás de Nginx.

El perfil `dev` del backend usa por defecto la base `sistema` con usuario
`sistema` y contraseña `cambia_esto` (los valores de `.env.example`). Si cambias
las credenciales en `.env`, expórtalas también al arrancar Quarkus o ajusta los
valores `%dev` de `backend/src/main/resources/application.properties`.

### Pruebas

```bash
cd frontend
npm test                      # Vitest
npm run build                 # TypeScript + build de producción

cd backend
./mvnw test
./mvnw package -DskipTests
```

Los tests del backend usan Dev Services: Testcontainers levanta un PostgreSQL
efímero y aplica las migraciones de Flyway. Si la imagen por defecto no está
disponible, se puede cambiar con `TEST_DB_IMAGE=postgres:17-alpine`; en equipos
donde no se pueda descargar Ryuk, `TESTCONTAINERS_RYUK_DISABLED=true` permite
ejecutar la suite igualmente.

---

## Estructura

```
.
├── backend/
│   ├── src/main/java/com/tuempresa/sistema/
│   │   ├── common/            # seguridad, errores, respuestas, archivos
│   │   ├── inventario/
│   │   ├── clientes/
│   │   ├── venta/
│   │   ├── caja/
│   │   ├── historial/
│   │   ├── cuentas/
│   │   └── dashboard/
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/V1__init.sql
│   ├── keys/                  # llaves JWT locales (ignoradas por git)
│   ├── Dockerfile
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/        # layout, guardias y UI compartida
│   │   ├── contexts/          # sesión JWT del usuario
│   │   ├── lib/               # api, navegación y utilidades
│   │   ├── modules/           # una carpeta por módulo
│   │   ├── App.tsx
│   │   ├── index.css          # tokens de diseño (Tailwind v4)
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── scripts/                   # generación de llaves JWT
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

Cada módulo nuevo del backend vive en su paquete `com.tuempresa.sistema.<módulo>`
con sus entidades, repositorios, servicios y resources. En el frontend, cada
módulo tiene su carpeta en `src/modules/<módulo>` (páginas, componentes y hooks
propios) y solo comparte `components/ui`, `components/layout` y `lib`.

### Base de datos

`backend/src/main/resources/db/migration/V1__init.sql` reemplaza al script de
referencia y **sí se versiona**: es la migración que crea el esquema en local y
en producción. Los cambios posteriores se agregan como `V2__…`, `V3__…`; la
migración `V1` no se edita una vez desplegada.

La base ya resuelve snapshots de precios/costos, historial de costos, una sola
caja abierta, validación de pagos, stock no negativo y numeración de
departamentos. El backend se encarga de mover stock, registrar
`movimiento_stock`, hashear contraseñas y crear el usuario principal inicial.

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Credenciales de PostgreSQL |
| `POSTGRES_PORT` | Puerto local de la base (por defecto `5432`) |
| `TZ` | Zona horaria de los contenedores (`America/Lima`) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Usuario principal inicial (obligatorio en producción) |
| `JWT_KEYS_DIR` | Carpeta local con `privateKey.pem` y `publicKey.pem` |
| `APP_AUTH_COOKIE_SECURE` | `true` solo con HTTPS; por defecto `false` para desarrollo local |
| `APP_UPLOADS_DIR` | Carpeta de imágenes compartida con Nginx (en contenedores `/data/uploads`) |

`.env` y las llaves `*.pem` no se versionan (excepto las llaves de prueba, que
son propias de los tests y viven en `backend/src/test/resources`).

---

## Cuentas y permisos

El acceso se resuelve con un JWT firmado guardado en la cookie HttpOnly
`access_token` (`SameSite=Lax`, 8 horas de vigencia). El frontend envía las
credenciales en todas las peticiones (`credentials: include`) y el backend
valida el token y el módulo en **cada endpoint protegido** mediante
`@RequiereModulo`.

- `POST /api/auth/login` — devuelve la sesión y escribe la cookie.
- `GET /api/auth/me` — sesión actual.
- `POST /api/auth/logout` — expira la cookie.
- `GET/POST /api/usuarios` y `GET/POST /api/roles` — administración (solo principal).
- `PUT /api/roles/{id}/modulos` — reemplaza los permisos del rol.

Los módulos son `INVENTARIO`, `CLIENTES`, `VENTA`, `CAJA`, `HISTORIAL`,
`CUENTAS` y `DASHBOARD`. `CUENTAS` pertenece únicamente al rol principal: el
backend rechaza asignarlo a cualquier otro rol y la interfaz oculta esa opción.
En el primer arranque se crea el usuario principal solo si la tabla `usuario`
está vacía; en desarrollo la contraseña es `admin123` y en producción se exige
`ADMIN_PASSWORD`.

La navegación se filtra según los módulos de la sesión: las rutas sin permiso
muestran "Acceso denegado" y un 401 global devuelve al usuario al login.

---

## Módulos y estado

| Módulo | Backend | Frontend | Estado |
|---|---|---|---|
| Base / layout / tema | estructura | estructura | Listo |
| Cuentas y permisos (login JWT) | implementado | implementado | Listo |
| Inventario | implementado | implementado | Listo |
| Caja y registrar venta | implementado | implementado | Listo |
| Resumen de caja e historial | implementado | implementado | Listo |
| Clientes y fiados | pendiente | pendiente | Pendiente |
| Dashboard | pendiente | pendiente | Pendiente |

Cada módulo se desarrolla en una rama `feature/<módulo>`, se prueba de punta a
punta y se integra a `develop` mediante pull request.

---

## Inventario

Categorías, productos, stock, costos, imágenes y mermas. Todos los endpoints
requieren autenticación y el módulo `INVENTARIO`.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET/POST` | `/api/categorias` | Listar y crear categorías |
| `PUT/DELETE` | `/api/categorias/{id}` | Renombrar y eliminar categoría |
| `GET` | `/api/productos?page=&size=&q=&categoriaId=` | Productos paginados y filtrados |
| `POST/PUT` | `/api/productos` y `/api/productos/{id}` | Crear y editar producto |
| `PATCH` | `/api/productos/{id}/stock` | Ajustar stock (genera `movimiento_stock`) |
| `PATCH` | `/api/productos/{id}/costo` | Cambiar costo; `null` lo deja sin costo |
| `POST` | `/api/productos/{id}/imagen` | Subir imagen (multipart, JPG/PNG/WebP ≤ 5 MB) |
| `GET` | `/api/uploads/{nombre}` | Descargar imagen en desarrollo (en producción la sirve Nginx) |
| `GET/POST` | `/api/mermas?mes=2026-11` | Listar mermas del mes y registrar una |

Reglas que aplica la base de datos y el backend:

- Los productos por **unidad** solo admiten stock entero; los de **kilo**
  aceptan hasta tres decimales. El stock nunca baja de cero.
- Todo cambio de stock se registra en `movimiento_stock` (`INGRESO`, `AJUSTE`
  o `MERMA`), incluido el stock inicial.
- Cada cambio de costo se guarda en `producto_costo_historial`.
- Las mermas descuentan stock y congelan el costo del momento en
  `fn_merma_snapshot`, para no alterar el historial.
- Las imágenes se guardan con un nombre único y se redimensionan a un máximo
  de 800 px (JPG/PNG); WebP se guarda sin redimensionar.

La interfaz ofrece filtros por búsqueda y categoría, tabla en escritorio y
tarjetas en móvil, acciones rápidas de stock/costo/imagen/merma, alertas de
productos sin costo o por vencer y panel mensual de mermas.

---

## Caja y registrar venta

Solo puede existir una caja abierta y no se puede vender con la caja cerrada.
Todos los endpoints requieren autenticación y su módulo (`VENTA` o `CAJA`).

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/catalogo?page=&size=25&q=&categoriaId=` | Catálogo paginado, más vendidos primero |
| `POST` | `/api/ventas` | Registrar venta, descontar stock y guardar movimientos |
| `GET` | `/api/caja/actual` | Estado de la caja (`{ abierta, caja }`) |
| `POST` | `/api/caja/abrir` y `/api/caja/cerrar` | Abrir o cerrar la caja actual |
| `GET` | `/api/caja/{id}/resumen` | Totales y productos vendidos (vista "General") |
| `GET` | `/api/caja/{id}/ventas` | Detalle por venta (vista "Por venta") |

El cliente envía solo `productoId`, `cantidad`, el método de pago y los montos
necesarios: **nunca envía totales ni precios**. El backend recalcula cada
subtotal desde la base, valida pago y stock, y guarda venta, ítems, descuento de
stock y `movimiento_stock` en una sola transacción. La base congela nombre,
tipo, precio y costo de cada línea con `fn_linea_snapshot`, de modo que cambiar
un costo después no altera ventas pasadas.

Reglas de pago:

- **Efectivo:** el recibido debe cubrir el total; el vuelto es la diferencia.
- **Transferencia:** requiere Yape o Plin y todo el monto se registra como
  transferencia, sin vuelto.
- **Ambos:** el efectivo debe ser mayor que cero y menor que el total; el resto
  se registra como transferencia con Yape o Plin, sin vuelto.

El catálogo ordena primero los productos más vendidos (según `venta_item`), con
búsqueda global y filtro por categoría paginados de 25 en 25. En la interfaz, el
ticket calcula total y vuelto en tiempo real; en móvil se abre como bottom sheet
con una barra inferior fija, y el pago con transferencia pasa por el modal
Yape/Plin antes de la confirmación de "Venta registrada". La pantalla de caja
muestra KPIs, alerta de productos sin costo y pestañas General / Por venta.

---

## Historial de cajas

Consulta de cajas registradas, de la más reciente a la más antigua. Los
endpoints requieren autenticación y el módulo `HISTORIAL`.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/historial/cajas?page=&size=30` | Cajas paginadas (`size` de 1 a 100) |
| `GET` | `/api/historial/cajas/{id}` | `{ resumen, ventas }` de una caja |

El detalle reutiliza los mismos servicios de caja que la pantalla de caja
actual, así que General y Por venta muestran exactamente los mismos datos. Una
caja inexistente devuelve 404 y una paginación inválida devuelve 400, ambos con
mensaje en español. La interfaz lista cada caja con su estado, total y ventas,
y permite paginar o abrir su detalle; el componente de detalle es compartido
con el módulo de caja.

---

## Producción (Hetzner)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

El override de producción deja de publicar el puerto de PostgreSQL y mantiene
expuesto solo el frontend. Para HTTPS se recomienda poner Caddy o Cloudflare
delante del puerto 80.

Backups mínimos:

```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup_$(date +%F).sql.gz
```

Además del `pg_dump`, hay que respaldar el volumen `uploads` (imágenes de
productos) y activar los snapshots del proveedor.

---

## Notas de diseño

- El tema visual (paleta violeta, tarjetas redondeadas, tipografía Plus Jakarta
  Sans) está definido como tokens de Tailwind v4 en `frontend/src/index.css`.
- El layout es responsive: sidebar fija en escritorio, drawer en tablet y barra
  inferior en teléfono.
- Los módulos de operación se implementan uno por uno; ya están completos
  Cuentas, Inventario, Venta, Caja e Historial. Clientes y Dashboard siguen en
  marcha.
