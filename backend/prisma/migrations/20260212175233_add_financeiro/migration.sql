-- CreateTable
CREATE TABLE "Financeiro" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "categoria" TEXT,
    "tipo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Financeiro_usuarioId_idx" ON "Financeiro"("usuarioId");

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
