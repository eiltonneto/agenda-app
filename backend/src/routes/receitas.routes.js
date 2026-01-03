import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// ======================================================
// 📌 LISTAR RECEITAS (Com filtro opcional de Mês/Ano)
// ======================================================
router.get("/", async (req, res) => {
  try {
    const { mes, ano } = req.query;

    let filtroData = {};

    // Se passar mês e ano, filtra o intervalo
    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      
      // Filtra pela data prevista de recebimento
      filtroData = {
        dataPrevista: {
          gte: inicio,
          lte: fim,
        },
      };
    }

    const receitas = await prisma.receita.findMany({
      where: {
        usuarioId: req.userId,
        ...filtroData,
      },
      orderBy: { dataPrevista: "asc" },
    });

    return res.json(receitas);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar receitas" });
  }
});

// ======================================================
// 📌 CRIAR NOVA RECEITA
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { descricao, valor, dataPrevista, tipo, status } = req.body;

    if (!descricao || !valor || !dataPrevista || !tipo) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    const novaReceita = await prisma.receita.create({
      data: {
        usuarioId: req.userId,
        descricao,
        valor, // O Prisma aceita string ou number para Decimal
        dataPrevista: new Date(dataPrevista),
        tipo, // Deve ser: 'VENDA', 'SERVICO', 'ALUGUEL', 'OUTRO'
        status: status || "PENDENTE",
      },
    });

    return res.status(201).json(novaReceita);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar receita" });
  }
});

// ======================================================
// 📌 DELETAR RECEITA
// ======================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.receita.delete({
      where: { id: Number(id), usuarioId: req.userId },
    });
    return res.json({ message: "Receita removida" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar receita" });
  }
});

// ======================================================
// 📌 MARCAR COMO RECEBIDA (Toggle Status)
// ======================================================
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'RECEBIDA' ou 'PENDENTE'

    const receita = await prisma.receita.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: { 
        status,
        dataRecebida: status === 'RECEBIDA' ? new Date() : null 
      },
    });

    return res.json(receita);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// ======================================================
// 📌 EDITAR RECEITA
// ======================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, dataPrevista, tipo, status } = req.body;

    const receita = await prisma.receita.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: {
        descricao,
        valor,
        dataPrevista: new Date(dataPrevista),
        tipo,
        status,
      },
    });

    return res.json(receita);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar receita" });
  }
});

export default router;