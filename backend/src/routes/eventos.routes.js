import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// ======================================================
// 🔐 TODAS AS ROTAS EXIGEM LOGIN
// ======================================================
router.use(authMiddleware);

// ======================================================
// 📌 (CORRIGIDO) RESUMO DO MÊS PARA O CALENDÁRIO
// ======================================================
router.get("/resumo-mes", async (req, res) => {
  try {
    const { data } = req.query; // Recebe ex: "2025-01-15"

    if (!data) {
      return res.status(400).json({ error: "Data é obrigatória." });
    }

    const dateObj = new Date(data);
    const ano = dateObj.getFullYear();
    const mes = dateObj.getMonth();

    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

    const eventos = await prisma.evento.findMany({
      where: {
        usuarioId: req.userId,
        inicio: {
          gte: inicioMes.toISOString(),
          lte: fimMes.toISOString(),
        },
      },
      select: {
        inicio: true,
      },
    });

    // Filtra para retornar apenas datas únicas no formato YYYY-MM-DD
    const datasUnicas = new Set();
    
    eventos.forEach((ev) => {
      // --- A CORREÇÃO ESTÁ AQUI ---
      // Criamos um 'new Date' para garantir que temos um objeto Data, 
      // mesmo que o banco devolva string.
      const dataFormatada = new Date(ev.inicio); 
      
      if (!isNaN(dataFormatada)) {
        const diaISO = dataFormatada.toISOString().split("T")[0];
        datasUnicas.add(diaISO);
      }
    });

    return res.json(Array.from(datasUnicas));
  } catch (error) {
    console.error("❌ Erro ao buscar resumo do mês:", error);
    return res.status(500).json({
      error: "Erro ao buscar resumo do mês.",
    });
  }
});

// ======================================================
// 📌 CRIAR EVENTO
// ======================================================
router.post("/", async (req, res) => {
  try {
    const {
      titulo,
      tipo,
      inicio,
      fim,
      cor,
      observacao,
      lembreteMinutosAntes1,
      lembreteMinutosAntes2,
    } = req.body;

    if (!titulo || !tipo || !inicio || !fim) {
      return res.status(400).json({
        error: "Título, tipo, início e fim são obrigatórios.",
      });
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    const agora = new Date();

    if (isNaN(inicioDate) || isNaN(fimDate)) {
      return res.status(400).json({
        error: "Datas inválidas. Use formato ISO.",
      });
    }

    if (fimDate <= inicioDate) {
      return res.status(400).json({
        error: "O horário final deve ser maior que o inicial.",
      });
    }

    // Verifica conflito
    const conflito = await prisma.evento.findFirst({
      where: {
        usuarioId: req.userId,
        AND: [
          { inicio: { lt: fimDate.toISOString() } },
          { fim: { gt: inicioDate.toISOString() } },
        ],
      },
    });

    if (conflito) {
      return res.status(409).json({
        error: "Já existe um evento nesse horário.",
      });
    }

    const evento = await prisma.evento.create({
      data: {
        titulo,
        tipo,
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString(),
        cor: cor || "#007AFF",
        observacao,
        lembreteMinutosAntes1,
        lembreteMinutosAntes2,
        usuarioId: req.userId,
      },
    });

    return res.status(201).json(evento);
  } catch (error) {
    console.error("❌ Erro ao criar evento:", error);
    return res.status(500).json({
      error: "Erro interno ao criar evento.",
    });
  }
});

// ======================================================
// 📌 ATUALIZAR EVENTO
// ======================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      tipo,
      inicio,
      fim,
      cor,
      observacao,
      lembreteMinutosAntes1,
      lembreteMinutosAntes2,
    } = req.body;

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    const evento = await prisma.evento.update({
      where: {
        id: Number(id),
        usuarioId: req.userId,
      },
      data: {
        titulo,
        tipo,
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString(),
        cor,
        observacao,
        lembreteMinutosAntes1,
        lembreteMinutosAntes2,
      },
    });

    return res.json(evento);
  } catch (error) {
    console.error("❌ Erro ao atualizar evento:", error);
    return res.status(500).json({
      error: "Erro ao atualizar evento.",
    });
  }
});

// ======================================================
// 📌 DELETAR EVENTO
// ======================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.evento.delete({
      where: {
        id: Number(id),
        usuarioId: req.userId,
      },
    });

    return res.json({
      message: "Evento excluído com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir evento:", error);
    return res.status(500).json({
      error: "Erro ao excluir evento.",
    });
  }
});

// ======================================================
// 📌 BUSCAR EVENTOS POR DIA
// ======================================================
router.get("/dia/:data", async (req, res) => {
  try {
    const { data } = req.params;
    const inicioDia = new Date(`${data}T00:00:00.000Z`);
    const fimDia = new Date(`${data}T23:59:59.999Z`);

    const eventos = await prisma.evento.findMany({
      where: {
        usuarioId: req.userId,
        inicio: {
          gte: inicioDia.toISOString(),
          lte: fimDia.toISOString(),
        },
      },
      orderBy: { inicio: "asc" },
    });

    return res.json(eventos);
  } catch (error) {
    console.error("❌ Erro ao buscar eventos:", error);
    return res.status(500).json({
      error: "Erro ao buscar eventos.",
    });
  }
});

export default router;