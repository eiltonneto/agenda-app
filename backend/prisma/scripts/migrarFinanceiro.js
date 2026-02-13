import prisma from "../src/database/prisma.js";
require('dotenv').config()

async function migrar() {
  console.log("Iniciando migração...");

  const receitas = await prisma.receita.findMany();
  for (const r of receitas) {
    await prisma.movimentacao.create({
      data: {
        descricao: r.descricao,
        valor: r.valor,
        data: r.dataRecebida || r.dataPrevista,
        tipo: "RECEITA",
        categoria: r.tipo,
        status: r.status === "RECEBIDA" ? "RECEBIDO" : "PENDENTE",
        usuarioId: r.usuarioId,
        createdAt: r.createdAt
      }
    });
  }

  const despesas = await prisma.despesa.findMany();
  for (const d of despesas) {
    await prisma.movimentacao.create({
      data: {
        descricao: d.descricao,
        valor: d.valor,
        data: d.dataPagamento || d.dataVencimento,
        tipo: "DESPESA",
        categoria: d.categoria,
        status: d.status === "PAGA" ? "PAGO" : "PENDENTE",
        usuarioId: d.usuarioId,
        createdAt: d.createdAt
      }
    });
  }

  console.log("Migração concluída.");
}

migrar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

