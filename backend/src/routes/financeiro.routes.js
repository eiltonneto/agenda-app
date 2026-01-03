import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// ======================================================
// 📊 DASHBOARD FINANCEIRO (REGIME DE CAIXA - SÓ REALIZADO)
// ======================================================
router.get("/resumo", async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ error: "Mês e Ano são obrigatórios." });
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    // 1. Somar APENAS Receitas RECEBIDAS (Dinheiro no bolso)
    const somaReceitas = await prisma.receita.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId: req.userId,
        dataPrevista: { gte: inicio, lte: fim },
        status: "RECEBIDA", // <--- FILTRO IMPORTANTE
      },
    });

    // 2. Somar APENAS Despesas PAGAS (Dinheiro que saiu)
    const somaDespesas = await prisma.despesa.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId: req.userId,
        dataVencimento: { gte: inicio, lte: fim },
        status: "PAGA", // <--- FILTRO IMPORTANTE
      },
    });

    const totalReceitas = Number(somaReceitas._sum.valor) || 0;
    const totalDespesas = Number(somaDespesas._sum.valor) || 0;
    const saldo = totalReceitas - totalDespesas;

    return res.json({
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: saldo,
    });

  } catch (error) {
    console.error("Erro no dashboard:", error);
    return res.status(500).json({ error: "Erro ao calcular resumo financeiro." });
  }
});

export default router;