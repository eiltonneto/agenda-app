import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// LISTAR EVENTOS  
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

// --- CRIAR (Com verificação de conflito) -> e geração financeira opcional
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

    // Verificação + criação
    // Nenhuma outra requisição pode "furar a fila" entre o findFirst e o create
    const result = await prisma.$transaction(async (tx) => {

      // Adicionado filtro por usuarioId (isolamento entre usuários)
      const conflitoLocal = await tx.evento.findFirst({
        where: {
          usuarioId: userId,          // Cada usuário só compete consigo mesmo
          categoria_id: String(categoria_id),
          AND: [
            { inicio: { lt: dataFim } },
            { fim: { gt: dataInicio } }
          ]
        }
      });

      // O throw dentro de $transaction faz o Prisma fazer ROLLBACK automático.
      if (conflitoLocal) {
        const erro = new Error("Este local já está reservado neste horário.");
        erro.code = "CONFLICT_SLOT";  // Código customizado para o frontend identificar
        throw erro;
      }

      // Só chega aqui se NÃO há conflito : criação segura
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

      // Geração financeira vinculada (dentro da mesma transação = ou ambos salvam, ou nenhum)
      if (gerarFinanceiro === true && valor) {
        const valorNumerico = parseFloat(String(valor).replace(',', '.'));

        await tx.receita.create({
          data: {
            descricao: `${tipo}: ${titulo}`,
            valor: valorNumerico,
            tipo: "OUTRO",
            eventDate: dataInicio,
            paidAt: null,
            createdAt: new Date(),
            status: "PENDENTE",
            usuarioId: userId,
            eventId: String(novoEvento.id)
          }
        });
      }

      return novoEvento;
    });

    return res.status(201).json(result);

  } catch (error) {
    // Frontend vai usar status 409 para mostrar mensagem específica de conflito de horário, sem depender da mensagem de texto (que pode mudar por motivos de UX ou tradução) 
    if (error.code === "CONFLICT_SLOT") {
      return res.status(409).json({
        error: "Este local já está reservado neste horário por outro agendamento.",
        conflict: true  // Flag explícita para o frontend identificar sem depender da mensagem
      });
    }

    console.error("ERRO BACKEND /eventos POST:", error);
    return res.status(500).json({ error: "Erro ao processar agendamento." });
  }
});

// ATUALIZAR (com verificação de conflito e atualização financeira vincualda ao comparecimento)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const { titulo, inicio, fim, categoria_id, cor_categoria, descricao, comparecido } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const eventoExistente = await tx.evento.findFirst({
        where: { id: String(id), usuarioId: userId }
      });

      if (!eventoExistente) {
        const erro = new Error("Evento não encontrado.");
        erro.code = "NOT_FOUND";
        throw erro;
      }

      const dataInicio = inicio ? new Date(inicio) : eventoExistente.inicio;
      const dataFim = fim ? new Date(fim) : eventoExistente.fim;
      const localId = categoria_id ? String(categoria_id) : eventoExistente.categoria_id;

      // Verifica conflito na edição (excluindo o próprio evento da verificação)
      if (inicio || fim || categoria_id) {
        const conflitoLocal = await tx.evento.findFirst({
          where: {
            usuarioId: userId,
            categoria_id: localId,
            id: { not: String(id) }, // Exclui o próprio evento
            AND: [
              { inicio: { lt: dataFim } },
              { fim: { gt: dataInicio } }
            ]
          }
        });

        if (conflitoLocal) {
          const erro = new Error("Este local já está reservado neste horário.");
          erro.code = "CONFLICT_SLOT";
          throw erro;
        }
      }

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

      // Atualiza financeiro vinculado ao comparecimento
      if (comparecido !== undefined) {
        const novoStatusFinanceiro = comparecido ? "RECEBIDA" : "PENDENTE";
        const novoPaidAt = comparecido ? new Date() : null;

        await tx.receita.updateMany({
          where: { usuarioId: userId, eventId: String(id) },
          data: {
            status: novoStatusFinanceiro,
            paidAt: novoPaidAt,
            eventDate: dataInicio
          },
        });
      }

      return atualizado;
    });

    return res.json(result);
  } catch (error) {
    if (error.code === "CONFLICT_SLOT") {
      return res.status(409).json({ error: error.message, conflict: true });
    }
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Erro ao atualizar evento:", error.message);
    return res.status(500).json({ error: "Erro interno ao atualizar." });
  }
});

// EXCLUIR (GARANTINDO EXLUSÃO DAS RECEITAS VINCULADAS)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.receita.deleteMany({ where: { eventId: String(id) } });
      await tx.evento.delete({ where: { id: String(id), usuarioId: req.userId } });
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir." });
  }
});

// EXCLUIR EM MASSA (Com verificação de propriedade e exclusão segura)
router.post("/excluir-massa", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido." });
    }

    const idsStr = ids.map(String);

    await prisma.$transaction(async (tx) => {
      await tx.receita.deleteMany({ where: { eventId: { in: idsStr } } });
      await tx.evento.deleteMany({
        where: { id: { in: idsStr }, usuarioId: req.userId }
      });
    });

    return res.status(200).json({ message: "Eventos excluídos com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir em massa:", error);
    return res.status(500).json({ error: "Erro ao excluir vários eventos." });
  }
});

export default router;