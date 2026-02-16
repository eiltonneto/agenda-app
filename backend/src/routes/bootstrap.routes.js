import { Router } from "express";
import prisma from "../database/prisma.js";

const router = Router();

// Rota GET /bootstrap (Estará protegida pelo middleware JWT)
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;

    // Define o início do dia de hoje (para pegar eventos daqui para a frente)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 🚀 A MÁGICA: Promise.all dispara todas as queries no banco SIMULTANEAMENTE
    const [usuario, eventos, receitasPendentes] = await Promise.all([
      
      // 1. Traz o usuário (já ignorando a senha direto na query por segurança)
      prisma.usuario.findUnique({
        where: { id: userId },
        select: { id: true, nome: true, email: true, foto: true }
      }),

      // 2. Traz a agenda (Eventos a partir de hoje para não carregar passado desnecessário)
      prisma.evento.findMany({
        where: { 
          usuarioId: userId,
          inicio: { gte: hoje } 
        },
        orderBy: { inicio: 'asc' }
      }),

      // 3. Traz o resumo financeiro (Ex: pendências para o dashboard)
      prisma.receita.findMany({
        where: { 
          usuarioId: userId,
          status: "PENDENTE"
        },
        orderBy: { dataPrevista: 'asc' }
      })
    ]);

    // Devolve um "pacotão" único para o frontend
    return res.json({
      usuario,
      eventos,
      receitasPendentes,
      statusTrial: "ATIVO" // Placeholder para o futuro status de assinatura
    });

  } catch (error) {
    console.error("ERRO NO BOOTSTRAP:", error);
    return res.status(500).json({ error: "Erro ao carregar os dados iniciais do sistema." });
  }
});

export default router;