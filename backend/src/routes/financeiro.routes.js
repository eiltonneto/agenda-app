import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

//
// --- DASHBOARD / RESUMO ---
//
router.get("/resumo", async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano || isNaN(Number(mes)) || isNaN(Number(ano))) {
      return res.status(400).json({
        error: "Mês e Ano são obrigatórios."
      });
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const receitas = await prisma.movimentacao.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId: req.userId,
        tipo: "RECEITA",
        data: { gte: inicio, lte: fim },
        status: "RECEBIDO"
      }
    });

    const despesas = await prisma.movimentacao.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId: req.userId,
        tipo: "DESPESA",
        data: { gte: inicio, lte: fim },
        status: "PAGO"
      }
    });

    const totalReceitas = Number(receitas._sum.valor) || 0;
    const totalDespesas = Number(despesas._sum.valor) || 0;

    return res.json({
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro no resumo."
    });
  }
});

//
// --- LISTAR MOVIMENTAÇÕES ---
//
router.get("/", async (req, res) => {
  try {
    const { mes, ano, tipo } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({
        error: "Mês e Ano são obrigatórios."
      });
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const movimentacoes = await prisma.movimentacao.findMany({
      where: {
        usuarioId: req.userId,
        data: { gte: inicio, lte: fim },
        ...(tipo ? { tipo } : {})
      },
      orderBy: { data: "asc" }
    });

    return res.json(movimentacoes);

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao buscar movimentações."
    });
  }
});

//
// --- CRIAR MOVIMENTAÇÃO ---
//
router.post("/", async (req, res) => {
  try {
    const { descricao, valor, tipo, categoria, data, status } = req.body;

    if (!descricao || !valor || parseFloat(valor) <= 0 || !tipo) {
      return res.status(400).json({
        error: "Dados inválidos."
      });
    }

    const mov = await prisma.movimentacao.create({
      data: {
        descricao,
        valor: parseFloat(valor),
        tipo,
        categoria,
        data,
        status,
        usuarioId: req.userId
      }
    });

    return res.json(mov);

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao criar movimentação."
    });
  }
});

//
// --- ATUALIZAR MOVIMENTAÇÃO ---
//
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { descricao, valor, tipo, categoria, data, status } = req.body;

    if (!descricao || !valor || parseFloat(valor) <= 0) {
      return res.status(400).json({
        error: "Descrição e valor válido são obrigatórios."
      });
    }

    const existente = await prisma.movimentacao.findFirst({
      where: { id, usuarioId: req.userId }
    });

    if (!existente) {
      return res.status(404).json({
        error: "Movimentação não encontrada."
      });
    }

    await prisma.movimentacao.update({
      where: { id },
      data: {
        descricao,
        valor: parseFloat(valor),
        tipo,
        categoria,
        data,
        status
      }
    });

    return res.json({ ok: true });

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao atualizar."
    });
  }
});

//
// --- ALTERAR STATUS ---
//
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    await prisma.movimentacao.update({
      where: { id },
      data: { status }
    });

    return res.json({ ok: true });

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao atualizar status."
    });
  }
});

//
// --- EXCLUSÃO INDIVIDUAL ---
//
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.notificacao.deleteMany({
      where: {
        referenciaId: id,
        usuarioId: req.userId
      }
    });

    await prisma.movimentacao.delete({
      where: { id }
    });

    return res.json({ ok: true });

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao excluir."
    });
  }
});

//
// --- EXCLUSÃO EM MASSA ---
//
router.post("/excluir-massa", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: "IDs inválidos."
      });
    }

    await prisma.notificacao.deleteMany({
      where: {
        referenciaId: { in: ids },
        usuarioId: req.userId
      }
    });

    await prisma.movimentacao.deleteMany({
      where: {
        id: { in: ids },
        usuarioId: req.userId
      }
    });

    return res.json({ ok: true });

  } catch (e) {
    return res.status(500).json({
      error: "Erro ao excluir em massa."
    });
  }
});

export default router;
