Version-Eco - Inventario (Full Stack)

Estructura del proyecto

- database: scripts SQL de PostgreSQL.
- backend: API REST con Node.js + Express + PostgreSQL.
- frontend: Aplicacion React (Vite).

Requisitos previos

1. PostgreSQL 13+.
2. Node.js 20+ (incluye npm).

Configuracion rapida

1. Base de datos
   - Crea la BD vacia version_eco_db.
   - Ejecuta database/01_schema_version_eco.sql.
   - Ejecuta database/05_migration_produccion_central.sql.
   - (Opcional) Carga datos demo con database/02_seed_demo.sql.
   - (Opcional) Limpia datos demo con database/03_cleanup_demo.sql.

2. Backend
   - Copia backend/.env.example a backend/.env.
   - Ajusta DATABASE_URL.
   - Instala dependencias en backend: npm install.
   - Inicia API en backend: npm run dev.

3. Frontend
   - Copia frontend/.env.example a frontend/.env.
   - Ajusta VITE_API_URL si hace falta.
   - Instala dependencias en frontend: npm install.
   - Inicia web en frontend: npm run dev.

Cobertura de requisitos funcionales

RF-01 Registro de Materia Prima
- Endpoint POST /api/materias-primas
- Pantalla Materias Primas (crear)
- Unidad de medida controlada por enum en BD

RF-02 Modificacion de Materia Prima
- Endpoint PUT /api/materias-primas/:id
- Historial automatico via trigger a materia_prima_historial
- Pantalla Materias Primas (editar)

RF-03 Eliminacion de Materia Prima
- Endpoint DELETE /api/materias-primas/:id
- Regla: no elimina si existe en detalle_formula
- Confirmacion en frontend antes de eliminar
- Si tiene historial de consumo, se retira del catalogo (inactiva) y se conserva trazabilidad.

RF-04 Registro de Productos
- Endpoint POST /api/productos
- Nombre unico en BD (indice unico case-insensitive)
- Pantalla Productos y Formulas (crear/editar/eliminar)
- Si el producto tiene historial, al eliminar se retira del catalogo (inactivo) y se conserva trazabilidad.

RF-05 Definicion de Formulas
- Endpoint PUT /api/productos/:productoId/formula
- Relacion N:M Producto-MateriaPrima en detalle_formula
- Pantalla Productos y Formulas (configurar formula)

RF-06 Registro de Sedes
- Endpoints CRUD /api/sedes
- Pantalla Sedes

Produccion y consumo automatico
- Endpoint POST /api/produccion
- Usa fn_registrar_produccion para:
  - validar stock de materias primas
  - descontar materias primas
   - aumentar inventario central de producto terminado
   - registrar movimiento de inventario central

Distribucion a sedes
- Endpoint POST /api/inventario/distribuciones
- Usa fn_distribuir_desde_central para:
   - descontar inventario central
   - aumentar inventario de la sede destino
   - registrar movimientos de traslado

Ajustes manuales por ventas u otros
- Endpoint POST /api/inventario/ajustes
- Usa fn_ajustar_inventario_manual
- Pantalla Inventario (ajuste manual)

Alertas de stock bajo
- Endpoint GET /api/alertas
- Basado en vistas:
  - vw_alertas_materia_prima_baja
  - vw_alertas_producto_sede_bajo
- Dashboard muestra alertas

Consultas rapidas de inventario
- Endpoint GET /api/inventario
- Endpoint GET /api/dashboard/resumen
- Pantallas Dashboard e Inventario

Scripts SQL utiles

- Crear esquema:
   - psql -U postgres -h localhost -d version_eco_db -W -f database/01_schema_version_eco.sql
- Aplicar migracion a produccion central:
   - psql -U postgres -h localhost -d version_eco_db -W -f database/05_migration_produccion_central.sql
- Cargar datos iniciales DEMO:
   - psql -U postgres -h localhost -d version_eco_db -W -f database/02_seed_demo.sql
- Borrar datos DEMO:
   - psql -U postgres -h localhost -d version_eco_db -W -f database/03_cleanup_demo.sql
- Borrar datos QA (pruebas automatizadas):
   - psql -U postgres -h localhost -d version_eco_db -W -f database/04_cleanup_qa.sql

Pruebas API (smoke)

- Ejecutar suite de requisitos funcionales por API:
   - powershell -ExecutionPolicy Bypass -File scripts/api_smoke_tests.ps1
