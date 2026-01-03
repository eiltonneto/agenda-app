import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// ======================================================
// 📌 LISTAR DESPESAS (Com filtro opcional de Mês/Ano)
// ======================================================
router.get("/", async (req, res) => {
  try {
    const { mes, ano } = req.query;
    let filtroData = {};

    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      
      filtroData = {
        dataVencimento: {
          gte: inicio,
          lte: fim,
        },
      };
    }

    const despesas = await prisma.despesa.findMany({
      where: {
        usuarioId: req.userId,
        ...filtroData,
      },
      orderBy: { dataVencimento: "asc" },
    });

    return res.json(despesas);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar despesas" });
  }
});

// ======================================================
// 📌 CRIAR NOVA DESPESA
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { descricao, valor, dataVencimento, categoria, status } = req.body;

    if (!descricao || !valor || !dataVencimento || !categoria) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    const novaDespesa = await prisma.despesa.create({
      data: {
        usuarioId: req.userId,
        descricao,
        valor,
        dataVencimento: new Date(dataVencimento),
        categoria, // 'FIXA', 'VARIAVEL', 'MANUTENCAO', etc.
        status: status || "PENDENTE",
      },
    });

    return res.status(201).json(novaDespesa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

// ======================================================
// 📌 DELETAR DESPESA
// ======================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.despesa.delete({
      where: { id: Number(id), usuarioId: req.userId },
    });
    return res.json({ message: "Despesa removida" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar despesa" });
  }
});

// ======================================================
// 📌 MARCAR COMO PAGA (Toggle Status)
// ======================================================
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'PAGA' ou 'PENDENTE'

    const despesa = await prisma.despesa.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: { 
        status,
        dataPagamento: status === 'PAGA' ? new Date() : null
      },
    });

    return res.json(despesa);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
});


// ======================================================
// 📌 EDITAR DESPESA
// ======================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, dataVencimento, categoria, status } = req.body;

    const despesa = await prisma.despesa.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: {
        descricao,
        valor,
        dataVencimento: new Date(dataVencimento),
        categoria,
        status,
      },
    });

    return res.json(despesa);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
});

export default router;