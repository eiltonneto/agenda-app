/*
  Warnings:

  - Changed the type of `inicio` on the `Evento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fim` on the `Evento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoNotificacao" ADD VALUE 'RECEITA';
ALTER TYPE "TipoNotificacao" ADD VALUE 'OUTRO';

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "inicio",
ADD COLUMN     "inicio" TIMESTAMP(3) NOT NULL,
DROP COLUMN "fim",
ADD COLUMN     "fim" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "foto" TEXT;
