CREATE TABLE "CategoriaEvento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "CategoriaEvento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoriaEvento_usuarioId_nome_key" ON "CategoriaEvento"("usuarioId", "nome");
CREATE INDEX "CategoriaEvento_usuarioId_idx" ON "CategoriaEvento"("usuarioId");

ALTER TABLE "CategoriaEvento" ADD CONSTRAINT "CategoriaEvento_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;