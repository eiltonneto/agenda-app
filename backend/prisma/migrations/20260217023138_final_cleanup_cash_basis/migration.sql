/*
  Warnings:

  - You are about to drop the column `dataPagamento` on the `Despesa` table. All the data in the column will be lost.
  - You are about to drop the column `dataVencimento` on the `Despesa` table. All the data in the column will be lost.
  - You are about to drop the column `dataPrevista` on the `Receita` table. All the data in the column will be lost.
  - You are about to drop the column `dataRecebida` on the `Receita` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Despesa" DROP COLUMN "dataPagamento",
DROP COLUMN "dataVencimento";

-- AlterTable
ALTER TABLE "Receita" DROP COLUMN "dataPrevista",
DROP COLUMN "dataRecebida";
