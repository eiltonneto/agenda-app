import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma.js";

const router = Router();

// LOGIN (Mantenha igual)
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) return res.status(401).json({ error: "Credenciais inválidas" });

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) return res.status(401).json({ error: "Credenciais inválidas" });

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET || "segredo", { expiresIn: "7d" });

    const { senhaHash, ...userSemSenha } = usuario;
    return res.json({ usuario: userSemSenha, token });
  } catch (err) {
    console.error("Erro Login:", err);
    return res.status(500).json({ error: "Erro no login" });
  }
});

// REGISTRO (Atualizado com Senha Forte)
router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) return res.status(400).json({ error: "Preencha todos os campos" });

    // --- REGRAS DE SENHA FORTE ---
    if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
    }
    if (!/\d/.test(senha)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos um número." });
    }
    if (!/[A-Z]/.test(senha)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra maiúscula." });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos um caractere especial (ex: @, #, !)." });
    }
    // -----------------------------

    const userExiste = await prisma.usuario.findUnique({ where: { email } });
    if (userExiste) return res.status(400).json({ error: "Email já cadastrado" });

    const senhaHash = await bcrypt.hash(senha, 8);

    const usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash },
    });

    return res.json(usuario);
  } catch (err) {
    console.error("Erro Registro:", err);
    return res.status(500).json({ error: "Erro ao criar conta." });
  }
});

export default router;