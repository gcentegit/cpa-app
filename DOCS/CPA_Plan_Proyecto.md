# CPA — Control de Proyectos y Aperturas
## Plan de Proyecto — Sistema Web de Gestión v1.0

> **590** locales · **8** marcas · **10** roles de usuario · **8** dptos con checklist · **4** fases de desarrollo
>
> Versión 1.0 — Abril 2026 · Confidencial

---

## 1. Resumen ejecutivo

CPA centraliza todos los procesos previos a la apertura de un local: desde la recepción de la nueva matrícula hasta la entrega de obra, cubriendo 8 departamentos con sus propios formularios, permisos y flujos de notificación automática.

> **Problema que resuelve CPA**
> Correos que van y vienen, comunicaciones perdidas, responsabilidades difusas entre departamentos. CPA convierte ese caos en un flujo estructurado: cada dpto. completa su formulario, ve el avance de los demás y recibe notificaciones cuando le toca actuar.

### Fuentes de datos

| Archivo | Contenido | Uso en CPA |
|---|---|---|
| `Directorio_de_Unidades.xlsx` | 590 locales · 8 marcas · histórico completo | Maestro de matrículas — fuente de verdad |
| `CPA_Altas_y_Migraciones.xlsm` | 189 locales en proceso activo | Datos operativos iniciales del checklist |

> **LO = LOB (Lobrador)**
> La marca LO del Directorio de Unidades es la misma que LOB. El código se actualiza LO → LOB en toda la base de datos. Los 7 locales con código LO se importan como LOB.

---

## 2. Stack tecnológico definitivo

| Capa | Tecnología | Motivo |
|---|---|---|
| **Frontend** | React + Vite + Tailwind CSS | Responsive PC/tablet/móvil · Dark mode con Tailwind `dark:` |
| **Backend** | Node.js + Express | API REST · middleware RBAC · audit log |
| **Base de datos** | PostgreSQL 15 | Concurrencia multi-usuario · ACID · JSON para datos flexibles |
| **Auth empleados** | better-auth + Azure AD (M365) | Login con cuenta corporativa. Baja en M365 = pérdida de acceso automática en CPA |
| **Auth franquiciados** | better-auth + email + contraseña + 2FA TOTP | Sin cuenta M365. 2FA con Google Authenticator |
| **Auth fallback** | better-auth + email + contraseña + 2FA TOTP | Usuarios internos sin M365 o externos (contratistas) |
| **Validación** | Zod (compartido front + back) | Un solo schema · validación en ambas capas |
| **Archivos adjuntos** | Multer + almacenamiento S3-compatible | Planos PDF · convenios laborales · SEPAs · presupuestos |
| **Notificaciones** | Nodemailer + SMTP / Resend | Alertas por evento por dpto · emails automáticos a proveedores (v2) |
| **Auditoría** | Tabla `audit_log` PostgreSQL | Quién · qué campo · valor anterior/nuevo · IP · timestamp |
| **Dark/Light mode** | Tailwind `dark:` + localStorage | Respeta preferencia del sistema + toggle manual por usuario |
| **Versionado** | SEMVER + Conventional Commits + semantic-release | Control de versiones automático |
| **Infraestructura** | VPS Oracle Cloud Free Tier + Dokploy | 24GB RAM · 4 cores · 150GB · prod + staging en el mismo VPS |
| **Repositorio** | Mono-repo GitHub privado `cpa-app` | branch `main`=prod · branch `dev`=staging |

---

## 3. Marcas y roles

### Marcas (8)

| Código | Nombre | Notas del checklist |
|---|---|---|
| **SGB** | Santagloria | 319 locales · sin campos especiales |
| **TDV** | Taberna del Volapié | 110 locales · sin campos especiales |
| **PPZ** | Papizza | 67 locales · sin campos especiales |
| **MQM** | MasQMenos | 50 locales · sin campos especiales |
| **LTL** | Lateral | 24 locales · requiere Planos PDF en checklist Técnico |
| **VZZ** | Vezzo | 13 locales · requiere Planos PDF en checklist Técnico |
| **LOB** | Lobrador (antes LO) | 7 locales · requiere Báscula TPV en checklist Técnico |
| **SIR** | Sir (histórica) | Solo lectura histórica · sin nuevas aperturas |

### Roles de usuario (10)

| Rol | Acceso | Formulario / Módulo propio |
|---|---|---|
| **IT** | Admin total | Checklist IT: datáfonos · evolbe · asociaciones (condicional por tipo y marca) |
| **Técnico Obras** | CRUD obras + su checklist | Checklist Técnico: equipamiento · fechas · planos (VZZ+LTL) · báscula (LOB) · cajón auto |
| **Operaciones / AM** | Sus locales asignados | Checklist Ops: asignación AM · Módulo pedidos iniciales con incidencias (por marca) |
| **Formación** | Checklist Formación | Fecha pedidos · fecha apertura · empresa (tabla) · datos franquiciado |
| **Marketing** | Checklist Marketing | Réplica catálogo/tarifa (desde locales abiertos) · cambios tarifa · link QR |
| **Compras** | Checklist Compras | Contratos Conway/café/cerveza/Coca-Cola · validación SEPAs (v2) |
| **Tesorería** | Solo locales propios | Checklist Tesorería: fondo de caja · CECO alfanumérico (solo propios) |
| **RRLL** | Solo locales propios | Checklist RRLL: convenio laboral · modelo productivo · horarios (campo repetidor) |
| **Dirección** | Solo lectura global | Dashboard KPIs · avance global del checklist · sin edición |
| **Franquiciado** | Solo su local (v1: lectura) | V1: solo lectura. V2: subir SEPAs y documentos para Compras |

---

## 4. Modelo de datos — tablas principales

Todas las tablas se crean completas en la Fase 1. Las fases posteriores solo añaden pantallas y endpoints encima del mismo esquema.

| Tabla | Campos principales | Propósito |
|---|---|---|
| `locales` | id (UUID), matricula, nombre, marca_id, propiedad, estado, pais, ccaa, provincia, municipio, direccion, telefono, ceco, razon_social | Maestro. 590 locales importados. Fuente de verdad. |
| `marcas` | id, codigo, nombre, activa, requiere_planos (bool), requiere_bascula (bool) | 8 marcas. Flags para lógica condicional del checklist. |
| `local_eventos` | id, local_id, tipo_evento, descripcion, fecha, usuario_id, datos_json | Historial: migraciones POS, reformas, restylings, cambios de estado |
| `checklist_it` | local_id, datafono_integrado, tipo_datafono, forma_pago, alta_evolbe, usuario_generico, asoc_dir_marca, asoc_am, asoc_rrll, asoc_rrhh, completado_por, fecha | Formulario IT. Campos condicionales según datafono_integrado y tipo de local. |
| `checklist_tecnico` | local_id, tecnico_nombre, fecha_entrega_obra, planos_pdf_url, num_tpv, num_imp_tpv, num_bascula, num_imp_comandas, num_comanderas, num_ap_wifi, cajon_auto, tipo_cajon, completado_por, fecha | Formulario Técnico. Planos solo VZZ+LTL. Báscula solo LOB. |
| `checklist_operaciones` | local_id, area_manager_id, completado_por, fecha | Formulario Ops: asignación AM desde tabla area_managers. |
| `checklist_formacion` | local_id, fecha_pedidos, fecha_apertura, empresa_id, nif, nombre_franquiciado, telefono_franquiciado, email_franquiciado, email_pedidos, completado_por, fecha | Formulario Formación. Empresa desde tabla empresas. |
| `checklist_marketing` | local_id, local_replica_catalogo_id, local_replica_tarifa_id, archivo_cambios_tarifa_url, link_qr, completado_por, fecha | Formulario Marketing. Réplica desde locales abiertos. |
| `checklist_compras` | local_id, codigo_conway, contrato_conway, contrato_cafe, contrato_cerveza, contrato_coca_cola, completado_por, fecha | Formulario Compras. Contratos de proveedores. |
| `checklist_tesoreria` | local_id, fondo_caja, ceco, completado_por, fecha | Solo propios: fondo de caja y CECO alfanumérico. |
| `checklist_rrll` | local_id, convenio_laboral_url, modelo_productivo, completado_por, fecha | Solo propios. Vinculada a horarios_rrll. |
| `horarios_rrll` | id, checklist_rrll_id, dia_semana, hora_entrada, hora_apertura, hora_cierre, hora_salida | Campo repetidor: una fila por turno laboral. |
| `obras` | id, local_id, titulo, contratista, presupuesto, fecha_inicio, fecha_entrega_estimada, fecha_entrega_real, estado | Módulo Obras (v1). Partidas por proyecto de obra. |
| `obra_comentarios` | id, obra_id, autor_id, contenido, fecha_visita, created_at | Comentarios por visita de obra · historial de avances. |
| `pedidos_iniciales` | id, local_id, marca_id, articulo, pedido_realizado, recibido, incidencia, nota_incidencia | Módulo pedidos iniciales Operaciones (por marca). |
| `empresas` | id, nombre, datos_fiscales, nombre_administrador, nombre_apoderado, nombre_responsable | Tabla de empresas franquiciadoras para checklist Formación. |
| `area_managers` | id, usuario_id, zonas[], marcas[] | Tabla de AMs para checklist Operaciones. |
| `usuarios` | id (UUID), email, password_hash, nombre, apellidos, rol_id, azure_id, activo, totp_secret, created_at, last_login | azure_id para OAuth M365. totp_secret para 2FA. |
| `roles` | id, codigo, nombre | 10 roles. Incluye Franquiciado. |
| `permisos` | id, rol_id, modulo, accion, permitido | Matriz RBAC granular por módulo y acción. |
| `archivos_adjuntos` | id, entidad_tipo, entidad_id, nombre, url, subido_por, validado, validado_por, created_at | Planos, convenios, SEPAs (v2), presupuestos. |
| `audit_log` | id, tabla, registro_id, campo, valor_anterior, valor_nuevo, usuario_id, ip, timestamp | Trazabilidad completa de todos los cambios. |
| `notificaciones` | id, usuario_id, tipo, mensaje, leida, created_at | Centro notificaciones in-app y por email. |

---

## 5. Lógica condicional del checklist

Los formularios tienen campos que aparecen o desaparecen según la marca y el tipo de local. Esta lógica va en el frontend (React Hook Form `watch`) y en el backend (Zod `.refine()`).

| Campo | Condición | Dpto |
|---|---|---|
| Teléfono del local | Solo si tipo = PROPIA | IT |
| Tipo Datáfono Integrado | Solo si datafono_integrado = SÍ | IT |
| Forma de pago → VISA/GPRS | Si datafono_integrado = SÍ | IT |
| Forma de pago → VISA/AMEX | Si datafono_integrado = NO | IT |
| Adjuntar Planos PDF | Solo si marca = VZZ o LTL | Técnico |
| Número Báscula TPV | Solo si marca = LOB | Técnico |
| Tipo cajón automático (CashLogi/CashGuard) | Solo si cajon_auto = SÍ | Técnico |
| Fondo de Caja | Solo si tipo = PROPIA | Tesorería |
| CECO alfanumérico | Solo si tipo = PROPIA | Tesorería |
| Módulo RRLL completo | Solo si tipo = PROPIA | RRLL |
| SEPAs proveedores | Solo si tipo = FRANQUICIA (v2) | Compras / Franquiciado |

---

## 6. Plan de fases de desarrollo

4 fases. La BBDD se crea completa en Fase 1. Cada fase termina con software funcional en producción.

---

### FASE 1 — Cimientos: BBDD, Auth y Migración
**Semanas 1–2** · 590 locales importados · login M365 + email + 2FA funcionando

#### Orden de construcción

**Día 1-2: Scaffolding del mono-repo `cpa-app`**
- Carpetas: `/backend` · `/frontend` · `/scripts` · `/sql` · `/infra`
- `docker-compose.yml` (dev) · `docker-compose.prod.yml` · `docker-compose.staging.yml`
- `.env.example` documentado · `.gitignore` estricto

**Día 3-4: Esquema SQL completo**
- 23 tablas con índices, FK y constraints
- Seed: 10 roles + permisos + usuarios iniciales por dpto

**Día 5-6: Script de migración de datos**
- Lee `Directorio_de_Unidades.xlsx` + `CPA_Altas_y_Migraciones.xlsm`
- Convierte fechas seriales Excel → ISO 8601
- Actualiza código LO → LOB en todos los registros
- Cruza ambas fuentes por `MATRICULA` · detecta ~48 locales sin estado
- Importa los 590 locales con validación Zod

**Día 7-8: Auth completo con better-auth**
- Estrategia Azure AD / Microsoft 365 para empleados
- Estrategia email + contraseña + TOTP (2FA) para franquiciados y fallback
- JWT access token (8h) + refresh token (7d)
- Middleware `authMiddleware` + `can(accion)` + registro en `audit_log`

**Día 9-10: Deploy inicial**
- Instalar Dokploy · configurar subdominios · SSL con Let's Encrypt
- Configurar variables de entorno en Dokploy (prod y staging)
- Verificar que los 590 locales están importados correctamente

---

### FASE 2 — Maestro de Locales y Checklist por Dpto
**Semanas 3–5** · El sistema reemplaza el Excel · todos los dptos completan su checklist

#### Módulos

- API REST completa de locales: `GET/POST/PATCH/DELETE` · filtros · exportación Excel
- Frontend: login · sidebar por rol · dark/light mode · dashboard por rol
- Tabla locales con TanStack Table (590 filas virtualizadas) + filtros en tiempo real
- **8 formularios de checklist** con lógica condicional (React Hook Form + Zod):
  - IT · Técnico · Operaciones · Formación · Marketing · Compras · Tesorería · RRLL
- Gestión de usuarios, roles y matriz de permisos visual (solo IT)
- Notificaciones email cuando un dpto completa su parte del checklist
- Exportación Excel según filtros activos (ExcelJS)

---

### FASE 3 — Obras, Pedidos y Acceso Franquiciado
**Semanas 6–7** · Flujos avanzados por dpto operativos

#### Módulos

- **Módulo Obras v1**: proyectos · partidas · contratistas · presupuestos · comentarios por visita · historial fechas entrega · retroplanning individual
- **Módulo Pedidos Iniciales** (Operaciones): checklist por marca + registro de incidencias en recepción
- **Acceso básico franquiciado v1**: login con email+pass+2FA · solo lectura de su local · no puede editar
- Centro de notificaciones in-app (campana en topbar) + emails por eventos clave

---

### FASE 4 — Calidad, Backups, API y Preparación v2
**Semana 8** · Sistema robusto, documentado y preparado para crecer

#### Tareas

- Backups automáticos diarios con Dokploy → Backblaze B2
- Tests de integración completos · tests de permisos por rol
- SEMVER: semantic-release + Conventional Commits
- API documentada con Swagger/OpenAPI en `GET /api/docs`
- i18n instalado (react-i18next) · textos externalizados para ES/EN/CA
- README técnico · Runbook de operaciones · Guía de onboarding usuarios
- Preparar activación portal SEPA franquiciados (tablas ya existen en Fase 1)

---

## 7. Scope v1 vs v2

| Módulo | v1 (fases 1–4) | v2 (futura) |
|---|---|---|
| **Auth empleados** | OAuth M365 + email/pass + 2FA | — |
| **Auth franquiciados** | Email + pass + 2FA · solo lectura | Subir SEPAs y documentos · portal completo |
| **Maestro locales** | 590 locales · CRUD · filtros · exportar Excel | — |
| **Checklist 8 dptos** | Formularios completos con lógica condicional | — |
| **Módulo Obras** | Partidas · comentarios · retroplanning individual | Retroplanning global · escaneo de presupuestos con IA |
| **Portal SEPA franquiciados** | No en v1 | Subir SEPAs · validación Compras · notif. automática a proveedores |
| **Pedidos iniciales Ops** | Checklist por marca + incidencias | — |
| **Dark / Light mode** | Tailwind `dark:` + toggle por usuario | — |
| **API pública** | Swagger/OpenAPI (lectura) | Webhooks SAP y otros sistemas |
| **Idioma** | Español | Inglés + Catalán (arquitectura i18n lista en v1) |
| **App móvil nativa** | Web responsive (PC + tablet + móvil) | App nativa iOS / Android |

---

## 8. Alertas y puntos débiles detectados

> ⚠️ **Azure AD — registro obligatorio antes de la Fase 1**
> Para el login con M365 hay que registrar CPA en `portal.azure.com` → App registrations → New registration. Se obtienen `CLIENT_ID` y `TENANT_ID` que van como variables en Dokploy. Sin este paso el OAuth M365 no arranca.

> ⚠️ **Almacenamiento de archivos — decidir antes de la Fase 3**
> Planos PDF (Técnico), convenios laborales (RRLL) y futuros SEPAs (Compras v2) necesitan almacenamiento. Opción recomendada: S3-compatible externo (Backblaze B2 o Cloudflare R2) para producción. Decidirlo antes de empezar la Fase 3.

> ⚠️ **Tabla empresas — poblar antes del go-live**
> El checklist de Formación tiene un selector de Empresa con datos fiscales, administrador, apoderado y responsable. Pedir a Formación el listado completo de empresas franquiciadoras antes de la Fase 2.

> ⚠️ **~48 locales sin estado en el Directorio**
> El script de migración los importa con estado `Sin clasificar`. Antes del go-live alguien del equipo debe revisar esos registros y asignarles el estado correcto.

> ℹ️ **SMTP y reputación de dominio**
> Notificaciones desde un VPS nuevo pueden ir a spam. Recomendado: usar Resend.com o Brevo como relay en producción. En staging: Mailtrap para interceptar emails y no enviar accidentalmente a franquiciados o área managers.

---

## 9. Checklist antes de escribir la primera línea de código

| | Acción | Cuándo |
|---|---|---|
| `[ ]` | Registrar la app CPA en Azure AD → obtener `CLIENT_ID` y `TENANT_ID` | Antes de Fase 1 |
| `[ ]` | Crear repositorio privado `cpa-app` en GitHub con `.gitignore` correcto | Antes de Fase 1 |
| `[ ]` | Abrir puertos 80, 443, 8080 en Oracle Cloud Security Lists + iptables | Antes de Fase 1 |
| `[ ]` | Instalar Dokploy en el VPS · configurar subdominios · SSL | Antes de Fase 1 |
| `[ ]` | Obtener credenciales SMTP o crear cuenta Resend/Brevo | Antes de Fase 1 |
| `[ ]` | Crear cuenta Mailtrap para staging | Antes de Fase 1 |
| `[ ]` | Decidir estrategia almacenamiento archivos (VPS local vs S3 externo) | Antes de Fase 3 |
| `[ ]` | Pedir a Formación el listado de empresas franquiciadoras con datos fiscales | Antes de Fase 2 |
| `[ ]` | Pedir a Operaciones el listado de Área Managers con zonas y marcas | Antes de Fase 2 |
| `[ ]` | Revisar y aprobar la matriz de permisos con cada dpto | Antes de Fase 2 |
| `[ ]` | Resolver los ~48 locales sin estado (asignar estado correcto) | Antes de go-live |
| `[ ]` | Crear cuenta Backblaze B2 para backups automáticos de PostgreSQL | Antes de Fase 4 |
| `[ ]` | Preparar comunicación interna de lanzamiento a todos los dptos | Antes de go-live |

---

*CPA — Control de Proyectos y Aperturas · Plan de Proyecto v1.0 · Confidencial*
*590 locales · 8 marcas · 10 roles · 8 dptos con checklist · 4 fases · Oracle Cloud + Dokploy + GitHub*
