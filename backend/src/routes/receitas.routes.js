import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// 📌 LISTAR RECEITAS (Regime de Caixa - Regra 2)
router.get("/", async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const userId = req.userId;

    let whereCondition = { usuarioId: userId };

    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      
      whereCondition.OR = [
        { status: "PENDENTE" },
        {
          status: "RECEBIDA",
          paidAt: { gte: inicio, lte: fim }
        }
      ];
    }

    const receitas = await prisma.receita.findMany({
      where: whereCondition,
      orderBy: { eventDate: "asc" },
    });

    return res.json(receitas);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar receitas" });
  }
});

// 📌 CRIAR NOVA RECEITA
router.post("/", async (req, res) => {
  try {
    const { descricao, valor, eventDate, tipo, status, paidAt } = req.body;

    if (!descricao || !valor || !eventDate || !tipo) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    const novaReceita = await prisma.receita.create({
      data: {
        usuarioId: req.userId,
        descricao,
        valor: parseFloat(String(valor).replace(',', '.')),
        eventDate: new Date(eventDate),
        tipo,
        status: status || "PENDENTE",
        paidAt: status === "RECEBIDA" ? (paidAt ? new Date(paidAt) : new Date()) : null,
      },
    });

    return res.status(201).json(novaReceita);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar receita" });
  }
});

// 📌 MARCAR COMO RECEBIDA
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paidAt } = req.body;

    const receita = await prisma.receita.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: { 
        status,
        paidAt: status === 'RECEBIDA' ? (paidAt ? new Date(paidAt) : new Date()) : null
      },
    });

    return res.json(receita);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// 📌 EDITAR RECEITA
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, eventDate, tipo, status, paidAt } = req.body;

    const receita = await prisma.receita.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: {
        descricao,
        valor: valor ? parseFloat(String(valor).replace(',', '.')) : undefined,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        tipo,
        status,
        paidAt: status === 'RECEBIDA' && !paidAt ? new Date() : (paidAt ? new Date(paidAt) : null)
      },
    });

    return res.json(receita);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar receita" });
  }
});

export default router;