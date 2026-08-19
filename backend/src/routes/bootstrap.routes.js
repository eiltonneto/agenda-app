import { Router } from "express";
import prisma from "../database/prisma.js";
import { garantirCategoriasPadrao } from "./categorias-evento.routes.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;

    // início do mês e o início do próximo
    const dataAtual = new Date();
    const inicioDoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const inicioProximoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1);

    const [usuario, eventos, receitas, despesas, categorias] = await Promise.all([
      
      prisma.usuario.findUnique({
        where: { id: userId },
        select: { id: true, nome: true, email: true, foto: true }
      }),

      prisma.evento.findMany({
        where: { 
          usuarioId: userId
        },
        orderBy: { inicio: 'asc' }
      }),

      prisma.receita.findMany({
        where: { 
          usuarioId: userId,
          OR: [
            { status: "PENDENTE" },
            { 
              // Data entre o dia 1 deste mês e o dia 1 do próximo
              eventDate: { gte: inicioDoMes, lt: inicioProximoMes } 
            }
          ]
        },
        orderBy: { eventDate: 'asc' }
      }),

      prisma.despesa.findMany({
        where: { 
          usuarioId: userId,
          OR: [
            { status: "PENDENTE" },
            { 
              eventDate: { gte: inicioDoMes, lt: inicioProximoMes } 
            }
          ]
        },
        orderBy: { eventDate: 'asc' }
      }),

      garantirCategoriasPadrao(userId)
    ]);

    return res.json({ usuario, eventos, receitas, despesas, categorias, statusTrial: "ATIVO" });

  } catch (error) {
    console.error("ERRO NO BOOTSTRAP:", error);
    return res.status(500).json({ error: "Erro ao carregar os dados iniciais." });
  }
});

export default router;