import { Router } from "express";
import prisma from "../database/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const authConfig = {
  secret: process.env.JWT_SECRET || "f4930353163359556133965586686733", 
  expiresIn: "7d",
};

router.post("/", async (req, res) => {
  try {
    const { email, password, senha } = req.body;
    const senhaLogin = password || senha; 

    if (!email || !senhaLogin) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    // Busca o usuário no banco pelo email
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "E-mail não encontrado." });
    }

    // Verifica se a senha existe no banco
    const senhaHashBanco = user.senha || user.password || user.senhaHash;
    if (!senhaHashBanco) {
        return res.status(500).json({ error: "Erro de cadastro: Senha não encontrada no banco." });
    }

    // Comapara a senha com o hash salvo no banco 
    const checkPassword = await bcrypt.compare(senhaLogin, senhaHashBanco);

    if (!checkPassword) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    // Gera o Token com o ID do usuário e as configurações de expiração
    const token = jwt.sign(
      { id: user.id }, // payload do toke, aqui estamos colocando o ID do usuário para identificar quem é o usuário autenticado (somente o ID para não expor informnações secretas no token)
       authConfig.secret, {// JWT_SECRET do .env
      expiresIn: authConfig.expiresIn, // Tempo de expiração do token, aqui estamos usando 7 dias, mas pode ser ajustado conforme a necessidade
    });
    
    // Horizonte de tempo (Mês Atual)
    //O que está PENDENTE + o que entrou/foi pago no CAIXA no mês vigente (Regfime de Caixa)
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
        orderBy: { inicio: 'asc' } // 
      }),

      // Receitas: Segue o Regime de Caixa
      prisma.receita.findMany({ 
        where: { 
          usuarioId: user.id,
          OR: [
            { status: "PENDENTE" }, // Tudo que está atrasado ou a receber 
            { 
              status: "RECEBIDA", 
              paidAt: { gte: inicioMes, lte: fimMes } // O que entrou no CAIXA este mês
            }
          ]
        }
      }),

      // Despesas
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