import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// Listar notificações (todas ou só as ativas)
router.get("/", async (req, res) => {
  try {
    const { ativas } = req.query;

    const agora = new Date();

    const where = {
      usuarioId: req.userId,
      ...(ativas === "true"
        ? { disparoEm: { lte: agora }, lida: false }
        : {}),
    };

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { disparoEm: "asc" },
    });

    return res.json(notificacoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

// Marcar como lida
router.patch("/:id/lida", async (req, res) => {
  try {
    const { id } = req.params;

    const notif = await prisma.notificacao.update({
      where: { id: Number(id) },
      data: { lida: true },
    });

    return res.json(notif);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao marcar notificação como lida" });
  }
});

export default router;
