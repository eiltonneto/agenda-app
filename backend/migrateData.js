import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando migração de dados (Modo ESM)...");

  try {
    // 1. Migrar Receitas
    const receitas = await prisma.receita.findMany();
    console.log(`Buscando ${receitas.length} receitas...`);
    
    for (const rec of receitas) {
      await prisma.receita.update({
        where: { id: rec.id },
        data: {
          eventDate: rec.dataPrevista,
          paidAt: rec.dataRecebida,
        }
      });
    }
    console.log(`✅ Receitas migradas com sucesso.`);

    // 2. Migrar Despesas
    const despesas = await prisma.despesa.findMany();
    console.log(`Buscando ${despesas.length} despesas...`);

    for (const desp of despesas) {
      await prisma.despesa.update({
        where: { id: desp.id },
        data: {
          eventDate: desp.dataVencimento,
          paidAt: desp.dataPagamento,
        }
      });
    }
    console.log(`✅ Despesas migradas com sucesso.`);

  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    console.log("👋 Desconectado do banco.");
  });