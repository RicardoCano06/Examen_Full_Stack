-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensión para búsquedas parciales LIKE/ILIKE eficientes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabla: personas (sin CHECK sobre fecha_nacimiento, sin columna edad)
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres VARCHAR NOT NULL,
    apellidos VARCHAR NOT NULL,
    nro_documento VARCHAR NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    ruta_foto_frente VARCHAR NOT NULL,
    ruta_foto_dorso VARCHAR NOT NULL
);

-- Tabla: auditoria_busquedas
CREATE TABLE IF NOT EXISTS auditoria_busquedas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    termino_buscado VARCHAR,
    cantidad_resultados INTEGER,
    ip_origen VARCHAR,
    info_geolocalizacion JSONB,
    notificacion_telegram_exitosa BOOLEAN
);

-- Índice único B-Tree para nro_documento
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_nro_documento
    ON personas USING btree (nro_documento);

-- Índices GIN con gin_trgm_ops para búsquedas parciales LIKE/ILIKE
CREATE INDEX IF NOT EXISTS idx_personas_nombres_trgm
    ON personas USING gin (nombres gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_personas_apellidos_trgm
    ON personas USING gin (apellidos gin_trgm_ops);
