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

// --- CRIAR (Com Regra de Local Físico e Financeiro Automático) ---
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

    // LÓGICA DE CONFLITO: $T_{inicio} < E_{fim} \land T_{fim} > E_{inicio}$
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

      // Integração automática com o Financeiro
      if (gerarFinanceiro === true && valor) {
        const valorNumerico = parseFloat(String(valor).replace(',', '.'));
        
        await tx.receita.create({
          data: {
            descricao: `Racha: ${titulo}`,
            valor: valorNumerico,
            tipo: "OUTRO", // Ajustado conforme seu enum TipoReceita atual
            dataPrevista: dataInicio,
            status: "RECEBIDA",
            usuarioId: userId
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

// --- ATUALIZAR ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const { titulo, inicio, fim, categoria_id, cor_categoria, descricao } = req.body;

  try {
    const eventoExistente = await prisma.evento.findFirst({
      where: { id, usuarioId: userId }
    });

    if (!eventoExistente) return res.status(404).json({ error: "Evento não encontrado." });

    const dataInicio = inicio ? new Date(inicio) : eventoExistente.inicio;
    const dataFim = fim ? new Date(fim) : eventoExistente.fim;
    const localId = categoria_id ? String(categoria_id) : eventoExistente.categoria_id;

    const conflito = await prisma.evento.findFirst({
      where: {
        categoria_id: localId,
        id: { not: id }, 
        AND: [
          { inicio: { lt: dataFim } },
          { fim: { gt: dataInicio } }
        ]
      }
    });

    if (conflito) {
      return res.status(409).json({ error: "Este novo horário/local já está ocupado." });
    }

    const atualizado = await prisma.evento.update({
      where: { id },
      data: {
        titulo: titulo || undefined,
        inicio: dataInicio,
        fim: dataFim,
        categoria_id: localId,
        cor_categoria: cor_categoria || undefined,
        descricao: descricao || undefined
      }
    });

    return res.json(atualizado);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar." });
  }
});

// --- EXCLUIR ---
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.evento.delete({ where: { id: String(id), usuarioId: req.userId } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir." });
  }
});

// --- EXCLUIR EM MASSA ---
router.post("/excluir-massa", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Nenhum item selecionado." });

  try {
    const result = await prisma.evento.deleteMany({
      where: { id: { in: ids }, usuarioId: req.userId }
    });
    return res.json({ message: `${result.count} eventos excluídos.` });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir em massa." });
  }
});

export default router;