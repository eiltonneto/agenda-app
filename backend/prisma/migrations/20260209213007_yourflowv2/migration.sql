/*
  Warnings:

  - You are about to drop the column `cor` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `lembreteMinutosAntes1` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `lembreteMinutosAntes2` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `observacao` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Usuario` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('RACHA', 'EVENTO_CLUBE', 'FESTA', 'REUNIAO', 'MANUTENCAO', 'OUTRO');

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "cor",
DROP COLUMN "createdAt",
DROP COLUMN "lembreteMinutosAntes1",
DROP COLUMN "lembreteMinutosAntes2",
DROP COLUMN "observacao",
ADD COLUMN     "cor_categoria" TEXT,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "lembrete_minutos" INTEGER;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "updatedAt",
ALTER COLUMN "senhaHash" DROP NOT NULL;
