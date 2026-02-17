import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.use(authMiddleware);

// --- LISTAR ---
router.get("/", async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { usuarioId: req.userId },
      orderBy: { inicio: "asc" },
    });
    return res.json(eventos);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar eventos" });
  }
});

// --- CRIAR (Com Geração Automática) ---
router.post("/", async (req, res) => {
  const userId = req.userId;

  try {
    const {
      titulo, inicio, fim, categoria_id, tipo, 
      cor_categoria, descricao, lembreteValor, gerarFinanceiro, valor
    } = req.body;

    if (!titulo || !categoria_id || !inicio || !fim) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    if (dataFim <= dataInicio) {
      return res.status(400).json({ error: "O horário de término deve ser maior que o de início." });
    }

    // LÓGICA DE CONFLITO (Mantida)
    const conflitoLocal = await prisma.evento.findFirst({
      where: {
        categoria_id: String(categoria_id),
        AND: [
          { inicio: { lt: dataFim } },
          { fim: { gt: dataInicio } }
        ]
      }
    });

    if (conflitoLocal) {
      return res.status(409).json({ 
        error: "Este campo/local já está reservado neste horário por outro agendamento." 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const novoEvento = await tx.evento.create({
        data: {
          titulo,
          inicio: dataInicio,
          fim: dataFim,
          categoria_id: String(categoria_id),
          tipo,
          cor_categoria,
          descricao,
          lembrete_minutos: lembreteValor ? Number(lembreteValor) : 0,
          usuario: { connect: { id: userId } }
        }
      });

      // 🚀 REGIME DE CAIXA: Geração Automática Blindada
      if (gerarFinanceiro === true && valor) {
        const valorNumerico = parseFloat(String(valor).replace(',', '.'));
        
        await tx.receita.create({
          data: {
            descricao: `${tipo}: ${titulo}`,
            valor: valorNumerico,
            tipo: "OUTRO", 
            
            // O Trio de Datas:
            eventDate: dataInicio, // Data da agenda
            paidAt: null,          // Regra: começa sempre null (inadimplência)
            createdAt: new Date(), 
            
            status: "PENDENTE",
            usuarioId: userId,
            eventId: String(novoEvento.id) // 🔗 Vínculo direto e inquebrável
          }
        });
      }

      return novoEvento;
    });

    return res.status(201).json(result);

  } catch (error) {
    console.error("ERRO BACKEND:", error);
    return res.status(500).json({ error: "Erro ao processar agendamento." });
  }
});

// --- ATUALIZAR (Com Vínculo Inteligente) ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const { titulo, inicio, fim, categoria_id, cor_categoria, descricao, comparecido } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const eventoExistente = await tx.evento.findFirst({
        where: { id: String(id), usuarioId: userId }
      });

      if (!eventoExistente) throw new Error("Evento não encontrado.");

      const dataInicio = inicio ? new Date(inicio) : eventoExistente.inicio;
      const dataFim = fim ? new Date(fim) : eventoExistente.fim;
      const localId = categoria_id ? String(categoria_id) : eventoExistente.categoria_id;

      // Atualiza o Evento
      const atualizado = await tx.evento.update({
        where: { id: String(id) },
        data: {
          titulo: titulo || undefined,
          inicio: dataInicio,
          fim: dataFim,
          categoria_id: localId,
          cor_categoria: cor_categoria || undefined,
          descricao: descricao !== undefined ? descricao : undefined,
          comparecido: comparecido !== undefined ? comparecido : undefined 
        }
      });

      // 🚀 REGIME DE CAIXA: Atualização do Financeiro pelo Vínculo 'eventId'
      if (comparecido !== undefined) {
        const novoStatusFinanceiro = comparecido ? "RECEBIDA" : "PENDENTE";
        const novoPaidAt = comparecido ? new Date() : null; // Se pagou agora, carimba 'hoje'
        
        // Buscamos a receita vinculada a ESTE evento específico
        // Isso é muito mais rápido e seguro que buscar por título e data
        await tx.receita.updateMany({
          where: {
            usuarioId: userId,
            eventId: String(id) 
          },
          data: {
            status: novoStatusFinanceiro,
            paidAt: novoPaidAt, // Atualiza o caixa conforme o comparecimento
            eventDate: dataInicio // Se mudou a data do racha, atualiza a referência financeira
          },
        });
      }

      return atualizado;
    });

    return res.json(result);
  } catch (error) {
    console.error("Erro ao atualizar evento:", error.message);
    return res.status(error.message === "Evento não encontrado." ? 404 : 500).json({ error: error.message });
  }
});

// --- EXCLUIR (Limpeza total) ---
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Usamos transação para não deixar "receita órfã" no banco
    await prisma.$transaction(async (tx) => {
      // 1. Apaga a receita vinculada (se houver)
      await tx.receita.deleteMany({ where: { eventId: String(id) } });
      
      // 2. Apaga o evento
      await tx.evento.delete({ where: { id: String(id), usuarioId: req.userId } });
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;