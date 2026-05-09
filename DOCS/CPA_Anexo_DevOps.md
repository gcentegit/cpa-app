# CPA — Control de Proyectos y Aperturas
## Anexo DevOps — GitHub + Dokploy + Oracle Cloud Free Tier

> Mono-repo `cpa-app` · Deploy manual · Producción + Staging · Auth M365 + 2FA
>
> Versión 1.0 — Abril 2026 · Complemento al Plan de Proyecto CPA

---

## 1. Estructura del repositorio `cpa-app`

Repositorio único (mono-repo) privado en GitHub. Un solo repositorio contiene frontend, backend, scripts e infraestructura.

### Configuración del repositorio

| Campo | Valor |
|---|---|
| **Nombre** | `cpa-app` (privado en GitHub) |
| **Branch principal** | `main` → conectado a producción en Dokploy |
| **Branch desarrollo** | `dev` → conectado a staging en Dokploy |
| **Estrategia de merge** | PR de `dev` a `main` antes de cada deploy a producción |
| **Quién hace push** | Solo el responsable técnico |

### Estructura de carpetas

```
cpa-app/
├── backend/                    ← API Node.js + Express
│   ├── src/
│   │   ├── routes/             ← locales · auth · usuarios · checklist · obras
│   │   ├── middleware/         ← auth · can() · auditLog · errorHandler
│   │   ├── models/             ← queries PostgreSQL por entidad
│   │   ├── schemas/            ← schemas Zod compartidos con frontend
│   │   └── services/           ← email · exportExcel · fileUpload
│   ├── Dockerfile
│   └── package.json
├── frontend/                   ← React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         ← tabla · modal · formularios · badges
│   │   ├── pages/              ← Login · Dashboard · Locales · Checklist · Obras
│   │   ├── hooks/              ← useAuth · useLocales · usePermissions
│   │   ├── context/            ← AuthContext.jsx
│   │   └── schemas/            ← mismos schemas Zod que backend
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   ├── migrate.js              ← importación 590 locales desde los 2 Excel
│   ├── seed.js                 ← roles · permisos · usuarios iniciales
│   └── backup.sh               ← pg_dump diario + envío a Backblaze B2
├── sql/
│   └── 001_initial_schema.sql  ← 23 tablas · índices · FK
├── infra/
│   └── nginx.conf              ← config personalizada si se necesita
├── docker-compose.yml          ← DEV LOCAL: PostgreSQL + Redis
├── docker-compose.prod.yml     ← PRODUCCIÓN (Dokploy lee este archivo)
├── docker-compose.staging.yml  ← STAGING (Dokploy lee este archivo)
├── .env.example                ← plantilla con TODAS las variables (sin valores reales)
├── .gitignore                  ← CRÍTICO: excluye .env · node_modules · dist
└── README.md
```

> 🚫 **NUNCA subir al repositorio:**
> `.env` · `.env.local` · `.env.prod` · `.env.staging` · `node_modules/` · `dist/` · `build/` · `*.log` · `/sql/dumps/` · archivos `.xlsx` con datos reales

---

## 2. Flujo de trabajo diario con VSCode + Claude Code

### El ciclo completo de una tarea

| Paso | Acción |
|---|---|
| **1. Abrir VSCode** | Con el mono-repo `cpa-app` abierto. Claude Code tiene contexto de todo el proyecto. |
| **2. Rama de trabajo** | Siempre trabajar en rama `dev`. Nunca directamente en `main`. |
| **3. Desarrollar + probar** | Código en local. PostgreSQL local via `docker-compose.yml`. |
| **4. Commit** | `git commit -m 'feat(checklist): formulario tecnico — logica condicional VZZ+LTL'` |
| **5. Push a dev** | `git push origin dev` |
| **6. Probar en staging** | Dokploy → app staging → Deploy → verificar en `staging.cpa.empresa.com` |
| **7. Merge a main** | `git checkout main` + `git merge dev` + `git push origin main` |
| **8. Deploy producción** | Dokploy → app producción → Deploy → verificar en `cpa.empresa.com` |

> ⚠️ **Regla de oro de los entornos**
> NUNCA hacer push directamente a `main` para desarrollar. `main` es sagrado — solo recibe merges de `dev` cuando staging ha verificado que todo funciona. Un deploy roto en producción afecta a todos los usuarios del sistema.

### Prompts recomendados para Claude Code

**Contexto inicial de cada sesión:**
```
Estoy en la Fase X del proyecto CPA (Control de Proyectos y Aperturas).
Es un mono-repo Node.js + React + PostgreSQL. El esquema SQL está en
/sql/001_initial_schema.sql. Los permisos por rol están en
/backend/src/middleware/can.js. La tarea de hoy es: [descripción concreta].
```

**Para el script de migración (tarea más crítica):**
```
Crea migrate.js que lea Directorio_de_Unidades.xlsx (hoja UNIFICADO, 590 filas)
y CPA_Altas_y_Migraciones.xlsm. Debe:
(1) convertir fechas seriales Excel a ISO 8601 con fórmula (serial-25569)*86400*1000,
(2) actualizar código LO a LOB en todos los registros,
(3) cruzar ambos archivos por MATRICULA,
(4) marcar con estado 'Sin clasificar' los ~48 locales con ESTADO vacío,
(5) insertar todo en PostgreSQL con pg usando el schema adjunto.
Usar librería xlsx para leer los archivos.
```

**Para un endpoint con permisos:**
```
Crea el endpoint GET /api/locales en Express. Debe:
- verificar JWT con authMiddleware
- comprobar permiso 'locales:read' con can()
- aceptar query params: marca, estado, tipo, zona, search
- usar pg con la tabla locales del schema adjunto
- registrar en audit_log
- devolver { data: [], total, page, pageSize }
```

**Para un formulario con lógica condicional:**
```
Crea ChecklistTecnico.jsx con React Hook Form + Zod. Debe:
- mostrar campo planos_pdf solo si marca es VZZ o LTL (watch('marca'))
- mostrar báscula solo si marca es LOB
- mostrar tipo_cajon solo si cajon_auto es SÍ
Usar schema Zod con .refine() para validar las condiciones también en backend.
```

> 💡 **Regla de oro con Claude Code**
> Nunca pedir "haz todo el módulo de locales". Siempre dividir en tareas de 1-2 horas: un endpoint, un componente, una migración. Cada tarea tiene un output verificable antes de pasar a la siguiente.

---

## 3. Oracle Cloud Free Tier — Configuración antes del primer deploy

> 🚨 **Firewall de Oracle bloquea todo por defecto**
> Oracle Cloud tiene DOS capas de firewall: Security Lists en la consola web de Oracle Y iptables dentro del propio servidor Ubuntu. Dokploy expone los puertos, pero si ambos firewalls no están abiertos, el sistema no será accesible desde internet. Es el error número 1 con Oracle Cloud.

### Paso 1 — Abrir puertos en Oracle Cloud Console

Ir a: **Oracle Cloud Console → Networking → Virtual Cloud Networks → tu VCN → Security Lists → Default Security List → Add Ingress Rules**

| Puerto | Propósito |
|---|---|
| **22** | SSH — ya debería estar abierto |
| **80** | HTTP — necesario para redirect a HTTPS y Let's Encrypt |
| **443** | HTTPS — tráfico principal del sistema |
| **8080** | Panel de Dokploy — solo durante la configuración inicial |

### Paso 2 — Abrir puertos en iptables dentro del servidor

Conectado por SSH al VPS:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo apt-get install iptables-persistent   # responder 'Yes' a ambas preguntas
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

### Paso 3 — Instalar Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Al terminar, Dokploy queda accesible en `http://IP_DEL_VPS:8080`. La primera vez pedirá crear un usuario administrador.

### Paso 4 — Configurar DNS

| Subdominio | Apunta a | Uso |
|---|---|---|
| `cpa.empresa.com` | IP pública del VPS | Producción |
| `staging.cpa.empresa.com` | misma IP del VPS | Staging / pruebas |
| `dokploy.empresa.com` | misma IP (opcional) | Panel de Dokploy con SSL |

---

## 4. Configurar Dokploy — Producción y Staging

### Conectar el repositorio de GitHub

1. Dokploy → Settings → Git Providers → GitHub → conectar cuenta
2. Dokploy tendrá acceso a todos los repos privados de tu cuenta
3. Para deploy manual: en Dokploy → tu app → Deploy (sin necesidad de webhook)

### Aplicación de Producción en Dokploy

| Campo | Valor |
|---|---|
| Tipo | Docker Compose |
| Repositorio | `cpa-app` |
| Branch | `main` |
| Archivo compose | `docker-compose.prod.yml` |
| Dominio | `cpa.empresa.com` con SSL activado |
| Deploy trigger | Manual |

### Aplicación de Staging en Dokploy

| Campo | Valor |
|---|---|
| Tipo | Docker Compose |
| Repositorio | `cpa-app` |
| Branch | `dev` |
| Archivo compose | `docker-compose.staging.yml` |
| Dominio | `staging.cpa.empresa.com` con SSL activado |
| Deploy trigger | Manual |

---

## 5. Variables de entorno por entorno

Dokploy gestiona las variables desde su panel — **nunca en archivos del repositorio**.

| Variable | Producción | Staging |
|---|---|---|
| `NODE_ENV` | `production` | `staging` |
| `DATABASE_URL` | `postgresql://cpa:PASS@postgres:5432/cpa_prod` | `postgresql://cpa:PASS@postgres:5432/cpa_staging` |
| `JWT_SECRET` | 64 chars aleatorios **ÚNICOS** | 64 chars aleatorios **DISTINTOS** a prod |
| `JWT_REFRESH_SECRET` | 64 chars aleatorios **ÚNICOS** | 64 chars aleatorios **DISTINTOS** a prod |
| `AZURE_CLIENT_ID` | CLIENT_ID del registro en Azure AD | mismo (misma app Azure) |
| `AZURE_TENANT_ID` | TENANT_ID del directorio Azure | mismo (misma app Azure) |
| `AZURE_CLIENT_SECRET` | secret generado en Azure AD | mismo o uno de prueba |
| `SMTP_HOST` | `smtp.empresa.com` o relay Resend | `smtp.mailtrap.io` |
| `SMTP_PORT` | `587` | `2525` |
| `SMTP_USER` | usuario SMTP corporativo | usuario Mailtrap |
| `SMTP_PASS` | contraseña SMTP | contraseña Mailtrap |
| `SMTP_FROM` | `noreply@empresa.com` | `staging@empresa.com` |
| `FRONTEND_URL` | `https://cpa.empresa.com` | `https://staging.cpa.empresa.com` |
| `STORAGE_TYPE` | `s3` (Backblaze B2) | `local` |
| `S3_BUCKET` | `cpa-prod-files` | — |
| `REDIS_URL` | `redis://redis:6379` | `redis://redis:6379` |

> ⚠️ **SMTP en staging → Mailtrap obligatorio**
> Mailtrap intercepta todos los emails enviados desde staging y los muestra en su bandeja de prueba — no llegan a destinatarios reales. Cuenta gratuita en [mailtrap.io](https://mailtrap.io). Imprescindible para no enviar emails accidentales a franquiciados o área managers durante las pruebas.

> ℹ️ **Azure AD — cómo obtener las variables**
> `CLIENT_ID` y `TENANT_ID` en `portal.azure.com` → App registrations → CPA → Overview. `CLIENT_SECRET` en Certificates & secrets → New client secret. Estas 3 variables son las mismas en prod y staging (misma app Azure registrada).

---

## 6. Archivos docker-compose

### `docker-compose.yml` — Desarrollo local

Solo levanta los servicios de soporte. El backend y frontend se arrancan con `npm run dev` para hot-reload.

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cpa_dev
      POSTGRES_USER: cpa
      POSTGRES_PASSWORD: cpa_local
    ports:
      - '5432:5432'
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d   # aplica schema al iniciar
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
volumes:
  postgres_dev_data:
```

### `docker-compose.prod.yml` — Producción (Dokploy)

Todos los servicios. Dokploy inyecta las variables desde su panel.

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - NODE_ENV
      - DATABASE_URL
      - JWT_SECRET
      - JWT_REFRESH_SECRET
      - AZURE_CLIENT_ID
      - AZURE_TENANT_ID
      - AZURE_CLIENT_SECRET
      - SMTP_HOST
      - SMTP_PORT
      - SMTP_USER
      - SMTP_PASS
      - SMTP_FROM
      - FRONTEND_URL
      - REDIS_URL
      - STORAGE_TYPE
      - S3_BUCKET
    depends_on: [postgres, redis]
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.cpa-api.rule=Host(`cpa.empresa.com`) && PathPrefix(`/api`)'
  frontend:
    build: ./frontend
    restart: unless-stopped
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.cpa-app.rule=Host(`cpa.empresa.com`)'
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cpa_prod
      POSTGRES_USER: cpa
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_prod_data:/data
volumes:
  postgres_prod_data:
  redis_prod_data:
```

> El `docker-compose.staging.yml` es idéntico con los nombres de servicios cambiados (`cpa-api-staging`, `cpa-app-staging`) y apuntando al subdominio de staging.

---

## 7. Backups con Dokploy

Dokploy tiene un módulo de backups integrado para PostgreSQL — no hay que configurar scripts externos.

| Parámetro | Configuración recomendada |
|---|---|
| **Dónde configurar** | Dokploy → tu app producción → Database → Backups |
| **Frecuencia** | Diario a las 03:00 (hora con menos tráfico) |
| **Retención** | 7 backups diarios + 4 semanales |
| **Destino** | S3-compatible: Backblaze B2 (~2€/mes) o AWS S3 |
| **Qué hace** | `pg_dump` + compresión + subida al bucket externo |
| **Restauración** | Dokploy → Backups → seleccionar fecha → Restore |
| **Alerta si falla** | Email al admin si el backup no se completa |

> ℹ️ **Backblaze B2 — opción más económica**
> Compatible con la API de S3 (Dokploy la soporta). Tiene 10GB gratuitos — más que suficiente para meses de retención de CPA. Crear cuenta en [backblaze.com](https://backblaze.com) → crear bucket → obtener Application Key.

---

## 8. Checklist DevOps — antes del primer deploy

| | Acción | Cuándo |
|---|---|---|
| `[ ]` | Registrar app CPA en Azure AD → `CLIENT_ID` + `TENANT_ID` + `CLIENT_SECRET` | Antes de Fase 1 |
| `[ ]` | Crear repositorio privado `cpa-app` en GitHub con `.gitignore` correcto | Antes de Fase 1 |
| `[ ]` | Abrir puertos 80, 443, 8080 en Oracle Cloud Security Lists | Antes de Dokploy |
| `[ ]` | Abrir puertos con iptables + persistir con `netfilter-persistent` | Antes de Dokploy |
| `[ ]` | Instalar Dokploy en el VPS (`curl -sSL https://dokploy.com/install.sh \| sh`) | Inicio Fase 1 |
| `[ ]` | Crear registros DNS: `cpa.empresa.com` y `staging.cpa.empresa.com` → IP del VPS | Antes de SSL |
| `[ ]` | Conectar cuenta GitHub en Dokploy | Al instalar Dokploy |
| `[ ]` | Crear app **staging** en Dokploy (branch `dev`, `docker-compose.staging.yml`) | Inicio Fase 1 |
| `[ ]` | Crear app **producción** en Dokploy (branch `main`, `docker-compose.prod.yml`) | Inicio Fase 4 |
| `[ ]` | Configurar todas las variables de entorno en Dokploy (prod y staging) | Antes del primer deploy |
| `[ ]` | Crear cuenta Mailtrap y configurar SMTP en staging | Antes del primer deploy |
| `[ ]` | Crear cuenta Backblaze B2 y configurar backups en Dokploy para producción | Antes del go-live |
| `[ ]` | Ejecutar script de migración en producción (importar los 590 locales) | Al hacer go-live |
| `[ ]` | Verificar que staging NO envía emails reales (probar flujo de notificación) | Antes del go-live |
| `[ ]` | Hacer primer backup manual y verificar que se puede restaurar | Antes del go-live |

---

*CPA — Control de Proyectos y Aperturas · Anexo DevOps v1.0 · Confidencial*
*Oracle Cloud Free Tier · cpa-app GitHub · Dokploy · Auth M365 + 2FA · Producción + Staging*
