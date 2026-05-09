-- CPA - Control de Proyectos y Aperturas
-- Esquema inicial completo - 23 tablas

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLAS DE AUTENTICACIÓN Y RBAC
-- ========================================

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  rol_id INTEGER REFERENCES roles(id) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  totp_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE permisos (
  id SERIAL PRIMARY KEY,
  rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  permitido BOOLEAN DEFAULT TRUE,
  UNIQUE(rol_id, modulo, accion)
);

-- ========================================
-- TABLAS MAESTRAS
-- ========================================

CREATE TABLE marcas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  requiere_planos BOOLEAN DEFAULT FALSE,
  requiere_bascula BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricula VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  marca_id INTEGER REFERENCES marcas(id) NOT NULL,
  propiedad VARCHAR(20) NOT NULL CHECK (propiedad IN ('PROPIA', 'FRANQUICIA')),
  estado VARCHAR(50),
  pais VARCHAR(100),
  ccaa VARCHAR(100),
  provincia VARCHAR(100),
  municipio VARCHAR(100),
  direccion TEXT,
  telefono VARCHAR(20),
  ceco VARCHAR(20),
  razon_social VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  datos_fiscales TEXT,
  nombre_administrador VARCHAR(100),
  nombre_apoderado VARCHAR(100),
  nombre_responsable VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE area_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  zonas TEXT[],
  marcas INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABLAS DE CHECKLIST (8)
-- ========================================

CREATE TABLE checklist_it (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  datafono_integrado BOOLEAN,
  tipo_datafono VARCHAR(50),
  forma_pago VARCHAR(50),
  alta_evolbe BOOLEAN DEFAULT FALSE,
  usuario_generico BOOLEAN DEFAULT FALSE,
  asoc_dir_marca BOOLEAN DEFAULT FALSE,
  asoc_am BOOLEAN DEFAULT FALSE,
  asoc_rrll BOOLEAN DEFAULT FALSE,
  asoc_rrhh BOOLEAN DEFAULT FALSE,
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_tecnico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  tecnico_nombre VARCHAR(100),
  fecha_entrega_obra DATE,
  planos_pdf_url TEXT,
  num_tpv INTEGER DEFAULT 0,
  num_imp_tpv INTEGER DEFAULT 0,
  num_bascula INTEGER DEFAULT 0,
  num_imp_comandas INTEGER DEFAULT 0,
  num_comanderas INTEGER DEFAULT 0,
  num_ap_wifi INTEGER DEFAULT 0,
  cajon_auto BOOLEAN DEFAULT FALSE,
  tipo_cajon VARCHAR(50),
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_operaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  area_manager_id UUID REFERENCES area_managers(id),
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_formacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  fecha_pedidos DATE,
  fecha_apertura DATE,
  empresa_id INTEGER REFERENCES empresas(id),
  nif VARCHAR(20),
  nombre_franquiciado VARCHAR(200),
  telefono_franquiciado VARCHAR(20),
  email_franquiciado VARCHAR(255),
  email_pedidos VARCHAR(255),
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_marketing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  local_replica_catalogo_id UUID REFERENCES locales(id),
  local_replica_tarifa_id UUID REFERENCES locales(id),
  archivo_cambios_tarifa_url TEXT,
  link_qr TEXT,
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  codigo_conway VARCHAR(50),
  contrato_conway BOOLEAN DEFAULT FALSE,
  contrato_cafe BOOLEAN DEFAULT FALSE,
  contrato_cerveza BOOLEAN DEFAULT FALSE,
  contrato_coca_cola BOOLEAN DEFAULT FALSE,
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_tesoreria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  fondo_caja DECIMAL(10,2),
  ceco VARCHAR(20),
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE checklist_rrll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  convenio_laboral_url TEXT,
  modelo_productivo VARCHAR(100),
  completado_por UUID REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(local_id)
);

CREATE TABLE horarios_rrll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_rrll_id UUID REFERENCES checklist_rrll(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_entrada TIME,
  hora_apertura TIME,
  hora_cierre TIME,
  hora_salida TIME
);

-- ========================================
-- TABLAS DE MÓDULOS AVANZADOS
-- ========================================

CREATE TABLE obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  contratista VARCHAR(200),
  presupuesto DECIMAL(12,2),
  fecha_inicio DATE,
  fecha_entrega_estimada DATE,
  fecha_entrega_real DATE,
  estado VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE obra_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES usuarios(id),
  contenido TEXT NOT NULL,
  fecha_visita DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pedidos_iniciales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  marca_id INTEGER REFERENCES marcas(id),
  articulo VARCHAR(200) NOT NULL,
  pedido_realizado BOOLEAN DEFAULT FALSE,
  recibido BOOLEAN DEFAULT FALSE,
  incidencia BOOLEAN DEFAULT FALSE,
  nota_incidencia TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABLAS DE SOPORTE
-- ========================================

CREATE TABLE local_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(50) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id UUID REFERENCES usuarios(id),
  datos_json JSONB
);

CREATE TABLE archivos_adjuntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  subido_por UUID REFERENCES usuarios(id),
  validado BOOLEAN DEFAULT FALSE,
  validado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla VARCHAR(100),
  registro_id UUID,
  campo VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES usuarios(id),
  ip VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES
-- ========================================

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_permisos_rol ON permisos(rol_id);
CREATE INDEX idx_locales_matricula ON locales(matricula);
CREATE INDEX idx_locales_marca ON locales(marca_id);
CREATE INDEX idx_locales_estado ON locales(estado);
CREATE INDEX idx_checklists_local ON checklist_it(local_id), checklist_tecnico(local_id), checklist_operaciones(local_id);
CREATE INDEX idx_obras_local ON obras(local_id);
CREATE INDEX idx_obras_estado ON obras(estado);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(usuario_id, leida);

-- ========================================
-- SEED INICIAL - ROLES
-- ========================================

INSERT INTO roles (codigo, nombre) VALUES
  ('IT', 'IT - Soporte Técnico'),
  ('TECNICO_OBRAS', 'Técnico de Obras'),
  ('OPERACIONES', 'Operaciones / AM'),
  ('FORMACION', 'Formación'),
  ('MARKETING', 'Marketing'),
  ('COMPRAS', 'Compras'),
  ('TESORERIA', 'Tesorería'),
  ('RRLL', 'Recursos Humanos'),
  ('DIRECCION', 'Dirección'),
  ('FRANQUICIADO', 'Franquiciado');

-- ========================================
-- SEED INICIAL - MARCAS
-- ========================================

INSERT INTO marcas (codigo, nombre, activa, requiere_planos, requiere_bascula) VALUES
  ('SGB', 'Santagloria', TRUE, FALSE, FALSE),
  ('TDV', 'Taberna del Volapié', TRUE, FALSE, FALSE),
  ('PPZ', 'Papizza', TRUE, FALSE, FALSE),
  ('MQM', 'MasQMenos', TRUE, FALSE, FALSE),
  ('LTL', 'Lateral', TRUE, TRUE, FALSE),
  ('VZZ', 'Vezzo', TRUE, TRUE, FALSE),
  ('LOB', 'Lobrador', TRUE, FALSE, TRUE),
  ('SIR', 'Sir', FALSE, FALSE, FALSE);

-- ========================================
-- SEED INICIAL - PERMISOS BÁSICOS
-- ========================================

-- IT - Acceso total
INSERT INTO permisos (rol_id, modulo, accion)
SELECT r.id, 'auth', 'read' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'auth', 'write' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'usuarios', 'read' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'usuarios', 'write' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'locales', 'read' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'locales', 'write' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'checklist', 'read' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'checklist', 'write' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'obras', 'read' FROM roles r WHERE r.codigo = 'IT'
UNION SELECT r.id, 'obras', 'write' FROM roles r WHERE r.codigo = 'IT';

-- DIRECCION - Solo lectura
INSERT INTO permisos (rol_id, modulo, accion)
SELECT r.id, 'locales', 'read' FROM roles r WHERE r.codigo = 'DIRECCION'
UNION SELECT r.id, 'checklist', 'read' FROM roles r WHERE r.codigo = 'DIRECCION'
UNION SELECT r.id, 'obras', 'read' FROM roles r WHERE r.codigo = 'DIRECCION';

-- OTROS ROLES - Permisos básicos
INSERT INTO permisos (rol_id, modulo, accion)
SELECT r.id, 'auth', 'read' FROM roles r WHERE r.codigo IN ('TECNICO_OBRAS', 'OPERACIONES', 'FORMACION', 'MARKETING', 'COMPRAS', 'TESORERIA', 'RRLL', 'FRANQUICIADO');
