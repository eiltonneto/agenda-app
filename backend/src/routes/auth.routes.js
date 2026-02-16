import { Router } from "express";
import prisma from "../database/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

// --- AQUI ESTAVA O ERRO: Faltava essa configuração ---
const authConfig = {
  secret: process.env.JWT_SECRET || "f4930353163359556133965586686733", 
  expiresIn: "7d",
};
// -----------------------------------------------------

router.post("/", async (req, res) => {
  try {
    const { email, password, senha } = req.body;
    const senhaLogin = password || senha; 

    if (!email || !senhaLogin) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    // 1. Busca o usuário no banco
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "E-mail não encontrado." });
    }

    // 2. Verifica a senha
    const senhaHashBanco = user.senha || user.password || user.senhaHash;
    if (!senhaHashBanco) {
        return res.status(500).json({ error: "Erro de cadastro: Senha não encontrada no banco." });
    }

    const checkPassword = await bcrypt.compare(senhaLogin, senhaHashBanco);

    if (!checkPassword) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    // 3. Gera o Token
    const token = jwt.sign({ id: user.id }, authConfig.secret, {
      expiresIn: authConfig.expiresIn,
    });

    // --- 🚀 V3: O MESTRE DA VELOCIDADE (BOOTSTRAP NO LOGIN) ---
    // Define o início do dia de hoje para filtrar a agenda
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Promise.all executa as buscas SIMULTANEAMENTE no PostgreSQL
    // Pega o primeiro e último dia do mês atual
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Busca tudo sem filtro de data apertado
    const [eventos, receitas, despesas] = await Promise.all([
      prisma.evento.findMany({ 
        where: { usuarioId: user.id }, // Traz todo o histórico
        orderBy: { inicio: 'asc' } 
      }),
      prisma.receita.findMany({ 
        where: { usuarioId: user.id }
      }),
      prisma.despesa.findMany({ 
        where: { usuarioId: user.id }
      })
    ]);

    return res.json({
      user: { id: user.id, nome: user.nome, email: user.email, foto: user.foto },
      token,
      eventos, receitas, despesas // 👈 Agora mandamos tudo de uma vez!
    });

  } catch (error) {
    console.log("Erro Login:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default router;