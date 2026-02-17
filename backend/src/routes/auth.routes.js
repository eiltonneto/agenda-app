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

    // --- 🚀 V4: VELOCIDADE MÁXIMA E REGIME DE CAIXA ---
    
    // 1. Definimos o horizonte de tempo (Mês Atual)
// --- 🚀 REFINAMENTO REGIME DE CAIXA (V4) ---
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    const [eventos, receitas, despesas] = await Promise.all([
      // Agenda: Traz eventos do mês atual em diante
      prisma.evento.findMany({ 
        where: { 
          usuarioId: user.id,
          inicio: { gte: inicioMes } 
        },
        orderBy: { inicio: 'asc' } 
      }),

      // Receitas: Segue ESTREITAMENTE o Regime de Caixa (Regra 2)
      prisma.receita.findMany({ 
        where: { 
          usuarioId: user.id,
          OR: [
            { status: "PENDENTE" }, // 1. Tudo que está atrasado ou a receber (Inadimplência)
            { 
              status: "RECEBIDA", 
              paidAt: { gte: inicioMes, lte: fimMes } // 2. O que entrou no CAIXA este mês
            }
          ]
        }
      }),

      // Despesas: Segue ESTREITAMENTE o Regime de Caixa
      prisma.despesa.findMany({ 
        where: { 
          usuarioId: user.id,
          OR: [
            { status: "PENDENTE" },
            { 
              status: "PAGA", 
              paidAt: { gte: inicioMes, lte: fimMes } 
            }
          ]
        }
      })
    ]);

    return res.json({
      user: { id: user.id, nome: user.nome, email: user.email, foto: user.foto },
      token,
      eventos, 
      receitas, 
      despesas 
    });

  } catch (error) {
    console.log("Erro Login:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default router;