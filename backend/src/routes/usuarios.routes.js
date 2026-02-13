import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import path from "path";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js"; // Garante que o nome do arquivo está correto

const router = Router();

// Configuração do Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve("uploads"),
    filename: (req, file, cb) => {
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
});

/** * 1. ROTA PÚBLICA: Cadastro de Usuário 
 * Deve ficar ANTES do router.use(authMiddleware) para evitar o Erro 401
 */
router.post("/", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ error: "E-mail já cadastrado." });

    const senhaHash = await bcrypt.hash(senha, 8);

    const usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash }, // updatedAt é automático agora!
    });

    const { senhaHash: _, ...userSemSenha } = usuario;
    return res.status(201).json(userSemSenha);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "Erro ao criar conta. Verifique os dados." });
  }
});

/**
 * 2. PROTEÇÃO: A partir daqui, todas as rotas exigem Token JWT
 */
router.use(authMiddleware);

// ROTA: Atualizar Foto
router.patch("/foto", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhuma foto enviada." });

    const usuario = await prisma.usuario.update({
      where: { id: req.userId },
      data: { foto: req.file.filename },
    });

    const { senhaHash, ...userSemSenha } = usuario;
    return res.json(userSemSenha);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao salvar foto." });
  }
});

// ROTA: Alterar Senha
router.patch("/senha", async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });

    const checkSenha = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!checkSenha) return res.status(401).json({ error: "A senha atual está incorreta." });

    const novaHash = await bcrypt.hash(novaSenha, 8);
    await prisma.usuario.update({
      where: { id: req.userId },
      data: { senhaHash: novaHash },
    });

    return res.json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

export default router;