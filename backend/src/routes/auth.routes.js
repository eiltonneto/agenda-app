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
    const senhaLogin = password || senha; // Aceita tanto "password" quanto "senha"

    if (!email || !senhaLogin) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    // Busca o usuário no banco
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "E-mail não encontrado." });
    }

    // Verifica se a senha existe no banco (suporta campos diferentes para evitar erro)
    const senhaHashBanco = user.senha || user.password || user.senhaHash;
    if (!senhaHashBanco) {
        return res.status(500).json({ error: "Erro de cadastro: Senha não encontrada no banco." });
    }

    // Compara a senha digitada com a do banco
    const checkPassword = await bcrypt.compare(senhaLogin, senhaHashBanco);

    if (!checkPassword) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    // Gera o Token usando a configuração que criamos lá em cima
    const token = jwt.sign({ id: user.id }, authConfig.secret, {
      expiresIn: authConfig.expiresIn,
    });

    // Retorna usuário e token
    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        foto: user.foto
      },
      token,
    });

  } catch (error) {
    console.log("Erro Login:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default router;