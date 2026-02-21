import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// 📌 LISTAR DESPESAS (Regime de Caixa - Regra 2)
router.get("/", async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const userId = req.userId;

    let whereCondition = { usuarioId: userId };

    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      
      whereCondition.OR = [
        // 1. Mostra tudo o que está pendente (Inadimplência/Controle)
        { status: "PENDENTE" },
        // 2. Mostra o que foi PAGO estritamente neste mês (Regime de Caixa)
        {
          status: "PAGA",
          paidAt: { gte: inicio, lte: fim }
        }
      ];
    }

    const despesas = await prisma.despesa.findMany({
      where: whereCondition,
      orderBy: { eventDate: "asc" },
    });

    return res.json(despesas);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar despesas" });
  }
});

// 📌 CRIAR NOVA DESPESA
router.post("/", async (req, res) => {
  try {
    const { descricao, valor, eventDate, categoria, status, paidAt } = req.body;

    if (!descricao || !valor || !eventDate || !categoria) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    const novaDespesa = await prisma.despesa.create({
      data: {
        usuarioId: req.userId,
        descricao,
        valor: parseFloat(String(valor).replace(',', '.')),
        eventDate: new Date(eventDate),
        categoria,
        status: status || "PENDENTE",
        // Se já nascer paga, carimba o paidAt
        paidAt: status === "PAGA" ? (paidAt ? new Date(paidAt) : new Date()) : null,
      },
    });

    return res.status(201).json(novaDespesa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

// 📌 MARCAR COMO PAGA (Regra 3: Carimba paidAt)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paidAt } = req.body;

    const despesa = await prisma.despesa.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: { 
        status,
        paidAt: status === 'PAGA' ? (paidAt ? new Date(paidAt) : new Date()) : null
      },
    });

    return res.json(despesa);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// 📌 EDITAR DESPESA
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, eventDate, categoria, status, paidAt } = req.body;

    const despesa = await prisma.despesa.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: {
        descricao,
        valor: valor ? parseFloat(String(valor).replace(',', '.')) : undefined,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        categoria,
        status,
        paidAt: status === 'PAGA' && !paidAt ? new Date() : (paidAt ? new Date(paidAt) : null)
      },
    });

    return res.json(despesa);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
});

// --- 🗑️ ROTA: Excluir Despesa (Individual) ---
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido. Atualize a tela e tente novamente." });
    }


    await prisma.despesa.delete({
      where: { 
        id: id,
        usuarioId: req.userId 
      }
    });

    return res.status(200).json({ message: "Despesa excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir despesa:", error);
    return res.status(500).json({ error: "Erro interno ao excluir o lançamento." });
  }
});

// ROTA: Excluir Despesas em Massa 
router.post("/excluir-massa", async (req, res) => {
  try {
    const { ids } = req.body;

    // 1. Valida se é um array preenchido
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido." });
    }

    // 2. Transforma tudo em número e filtra (remove NaNs, zeros e IDs fantasmas)
    const idsValidos = ids.map(Number).filter(id => !isNaN(id) && id > 0);

    // 3. Se após o filtro não sobrar nenhum ID válido, recusa a operação
    if (idsValidos.length === 0) {
      return res.status(400).json({ error: "Nenhum ID válido para exclusão." });
    }

    // 4. Executa a exclusão com segurança apenas nos IDs reais
    await prisma.despesa.deleteMany({
      where: {
        id: { in: idsValidos }, 
        usuarioId: req.userId
      }
    });

    return res.status(200).json({ message: "Despesas excluídas com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir em massa:", error);
    return res.status(500).json({ error: "Erro ao excluir vários lançamentos." });
  }
});

export default router;