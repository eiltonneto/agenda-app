/*
  Warnings:

  - The values [FINANCEIRO] on the enum `TipoNotificacao` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Evento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `comparecido` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `senha` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the `Movimentacao` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `cor_categoria` on table `Evento` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Usuario` table without a default value. This is not possible if the table is not empty.
  - Made the column `senhaHash` on table `Usuario` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('FIXA', 'VARIAVEL', 'COMPRA_PRODUTO', 'MANUTENCAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('PENDENTE', 'PAGA', 'ATRASADA');

-- CreateEnum
CREATE TYPE "StatusReceita" AS ENUM ('PENDENTE', 'RECEBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoReceita" AS ENUM ('VENDA', 'SERVICO', 'ALUGUEL', 'OUTRO');

-- AlterEnum
BEGIN;
CREATE TYPE "TipoNotificacao_new" AS ENUM ('EVENTO', 'DESPESA', 'RECEITA', 'OUTRO');
ALTER TABLE "Notificacao" ALTER COLUMN "tipo" TYPE "TipoNotificacao_new" USING ("tipo"::text::"TipoNotificacao_new");
ALTER TYPE "TipoNotificacao" RENAME TO "TipoNotificacao_old";
ALTER TYPE "TipoNotificacao_new" RENAME TO "TipoNotificacao";
DROP TYPE "public"."TipoNotificacao_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Movimentacao" DROP CONSTRAINT "Movimentacao_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_pkey",
DROP COLUMN "comparecido",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cor_categoria" SET NOT NULL,
ADD CONSTRAINT "Evento_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Evento_id_seq";

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "senha",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "senhaHash" SET NOT NULL;

-- DropTable
DROP TABLE "Movimentacao";

-- DropEnum
DROP TYPE "CategoriaFinanceira";

-- DropEnum
DROP TYPE "StatusFinanceiro";

-- DropEnum
DROP TYPE "TipoMovimentacao";

-- CreateTable
CREATE TABLE "Despesa" (
    "id" SERIAL NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusDespesa" NOT NULL DEFAULT 'PENDENTE',
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoReceita" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataPrevista" TIMESTAMP(3),
    "dataRecebida" TIMESTAMP(3),
    "status" "StatusReceita" NOT NULL DEFAULT 'PENDENTE',
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
