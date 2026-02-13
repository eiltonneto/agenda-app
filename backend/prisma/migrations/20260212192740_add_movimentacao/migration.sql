/*
  Warnings:

  - You are about to drop the `Despesa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Financeiro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Receita` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "CategoriaFinanceira" AS ENUM ('FIXA', 'VARIAVEL', 'VENDA', 'SERVICO', 'ALUGUEL', 'EVENTO', 'MANUTENCAO', 'COMPRA_PRODUTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('PENDENTE', 'PAGO', 'RECEBIDO', 'CANCELADO');

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'FINANCEIRO';

-- DropForeignKey
ALTER TABLE "Despesa" DROP CONSTRAINT "Despesa_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Financeiro" DROP CONSTRAINT "Financeiro_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Receita" DROP CONSTRAINT "Receita_usuarioId_fkey";

-- DropTable
DROP TABLE "Despesa";

-- DropTable
DROP TABLE "Financeiro";

-- DropTable
DROP TABLE "Receita";

-- DropEnum
DROP TYPE "CategoriaDespesa";

-- DropEnum
DROP TYPE "StatusDespesa";

-- DropEnum
DROP TYPE "StatusReceita";

-- DropEnum
DROP TYPE "TipoReceita";

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "categoria" TEXT,
    "status" "StatusFinanceiro" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movimentacao_usuarioId_idx" ON "Movimentacao"("usuarioId");

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
