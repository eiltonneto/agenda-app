import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// LISTAR (Mais recentes primeiro)
router.get("/", async (req, res) => {
  try {
    const { apenasNaoLidas } = req.query;
    const agora = new Date();

    const where = {
      usuarioId: req.userId,
      disparoEm: { lte: agora }, // Só mostra o que já disparou
      ...(apenasNaoLidas === "true" ? { lida: false } : {}),
    };

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { disparoEm: "desc" }, // <--- Mudado para DESC (novas primeiro)
    });

    return res.json(notificacoes);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

// MARCAR UMA COMO LIDA
router.patch("/:id/lida", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notificacao.update({
      where: { id: Number(id), usuarioId: req.userId },
      data: { lida: true },
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao atualizar" });
  }
});

// MARCAR TODAS COMO LIDAS (NOVO)
router.patch("/ler-todas", async (req, res) => {
    try {
        await prisma.notificacao.updateMany({
            where: { usuarioId: req.userId, lida: false },
            data: { lida: true }
        });
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao atualizar todas." });
    }
});

// EXCLUSÃO EM MASSA (NOVO - Consistência com o resto do app)
router.post("/excluir-massa", async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "IDs inválidos" });

        await prisma.notificacao.deleteMany({
            where: { id: { in: ids }, usuarioId: req.userId }
        });
        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ error: "Erro ao excluir." });
    }
});

// CRIAR NOTIFICAÇÃO MANUAL (Útil para testes agora)
router.post("/", async (req, res) => {
    try {
        const { titulo, mensagem, tipo } = req.body;
        const notif = await prisma.notificacao.create({
            data: {
                titulo, 
                mensagem, 
                tipo: tipo || 'EVENTO',
                disparoEm: new Date(),
                usuarioId: req.userId
            }
        });
        return res.json(notif);
    } catch (e) { return res.status(500).json({ error: "Erro ao criar." }); }
});

export default router;