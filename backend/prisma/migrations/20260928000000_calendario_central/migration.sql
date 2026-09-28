-- El recinto queda reservado por el intervalo de ActividadAgenda. Las reservas
-- de equipos referencian esa actividad: no duplican sus fechas ni su estado.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "TipoActividadAgenda" AS ENUM ('EVENTO', 'VISITA_TECNICA');

CREATE TABLE "Recinto" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "direccion" TEXT NOT NULL,
  "clave" TEXT NOT NULL UNIQUE,
  CONSTRAINT "Recinto_nombre_no_vacio" CHECK (length(btrim("nombre")) > 0),
  CONSTRAINT "Recinto_direccion_no_vacia" CHECK (length(btrim("direccion")) > 0)
);

CREATE TABLE "ActividadAgenda" (
  "id" SERIAL PRIMARY KEY,
  "tipo" "TipoActividadAgenda" NOT NULL,
  "nombre" TEXT NOT NULL,
  "clienteNombre" TEXT NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL,
  "fin" TIMESTAMPTZ(3) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'Reservado',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recintoId" INTEGER NOT NULL REFERENCES "Recinto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventoId" INTEGER REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ActividadAgenda_intervalo_valido" CHECK ("inicio" < "fin"),
  CONSTRAINT "ActividadAgenda_nombre_no_vacio" CHECK (length(btrim("nombre")) > 0),
  CONSTRAINT "ActividadAgenda_cliente_no_vacio" CHECK (length(btrim("clienteNombre")) > 0),
  CONSTRAINT "ActividadAgenda_tipo_evento" CHECK (
    ("tipo" = 'EVENTO' AND "eventoId" IS NOT NULL) OR
    ("tipo" = 'VISITA_TECNICA' AND "eventoId" IS NULL)
  ),
  CONSTRAINT "ActividadAgenda_recinto_sin_traslapes"
    EXCLUDE USING gist ("recintoId" WITH =, tstzrange("inicio", "fin", '[)') WITH &&)
);

CREATE UNIQUE INDEX "ActividadAgenda_eventoId_key" ON "ActividadAgenda"("eventoId");
CREATE INDEX "ActividadAgenda_inicio_fin_idx" ON "ActividadAgenda"("inicio", "fin");

CREATE TABLE "ReservaEquipo" (
  "id" SERIAL PRIMARY KEY,
  "actividadId" INTEGER NOT NULL REFERENCES "ActividadAgenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "equipoId" INTEGER NOT NULL REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cantidad" INTEGER NOT NULL,
  CONSTRAINT "ReservaEquipo_cantidad_positiva" CHECK ("cantidad" > 0)
);
CREATE UNIQUE INDEX "ReservaEquipo_actividadId_equipoId_key" ON "ReservaEquipo"("actividadId", "equipoId");
CREATE INDEX "ReservaEquipo_equipoId_idx" ON "ReservaEquipo"("equipoId");
