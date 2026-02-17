-- AlterTable
ALTER TABLE "Despesa" ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Receita" ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);
