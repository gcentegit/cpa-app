# CPA - Control de Proyectos y Aperturas

Sistema web de gestión para el control de aperturas de locales, centralizando los procesos previos a la entrega de obra.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 15 |
| Auth | better-auth + 2FA (TOTP) |
| Validación | Zod |
| Infraestructura | Docker + Dokploy |

## Estructura del Proyecto

```
cpa-app/
├── backend/           # API Node.js
├── frontend/          # React + Vite
├── scripts/          # Migración y seed
├── sql/             # Schema PostgreSQL
├── infra/            # Configuración infra
├── DOCS/            # Documentación del proyecto
├── docker-compose.yml
├── docker-compose.prod.yml
└── docker-compose.staging.yml
```

## Configuración Local

1. Copiar `.env.example` a `.env`
2. Configurar las variables de entorno
3. Iniciar servicios:

```bash
# Base de datos y Redis
docker-compose up -d

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## Scripts Disponibles

```bash
# Aplicar schema SQL
psql postgresql://cpa:cpa_local@localhost:5432/cpa_dev -f sql/001_initial_schema.sql

# Crear usuario admin
cd scripts && node seed.js

# Migrar locales desde Excel
cd scripts && node migrate-excel.js
```

## Usuario Inicial

```
Email: admin@cpa.local
Contraseña: admin123
```

## Fases de Desarrollo

- **Fase 1:** Cimientos (BBDD, Auth, Migración) ✅
- **Fase 2:** Maestro de Locales y Checklist por Dpto
- **Fase 3:** Obras, Pedidos y Acceso Franquiciado
- **Fase 4:** Calidad, Backups, API y Preparación v2

## Documentación

Ver `/DOCS` para documentación detallada del proyecto.

## Licencia

PROPIETARIO - Confidencial
