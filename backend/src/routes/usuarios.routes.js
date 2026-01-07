import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import path from "path";
import prisma from "../database/prisma.js";

const router = Router();

// Configuração do Upload (Salvar na pasta uploads)
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve("uploads"),
    filename: (req, file, cb) => {
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
});

// ROTA: Atualizar Foto
router.patch("/foto", upload.single("foto"), async (req, res) => {
  try {
    // Se não veio arquivo, retorna erro
    if (!req.file) return res.status(400).json({ error: "Nenhuma foto enviada." });

    const { filename } = req.file;

    // Atualiza no banco usando o ID do usuário (vindo do authMiddleware)
    const usuario = await prisma.usuario.update({
      where: { id: req.userId },
      data: { foto: filename },
    });

    const { senhaHash, ...userSemSenha } = usuario;
    return res.json(userSemSenha);
  } catch (error) {
    console.error("Erro upload:", error);
    return res.status(500).json({ error: "Erro interno ao salvar foto" });
  }
});

// ROTA: Alterar Senha
router.patch("/senha", async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

    // Confere senha antiga
    const checkSenha = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!checkSenha) return res.status(401).json({ error: "A senha atual está incorreta." });

    // Cria hash da nova
    const novaHash = await bcrypt.hash(novaSenha, 8);

    await prisma.usuario.update({
      where: { id: req.userId },
      data: { senhaHash: novaHash },
    });

    return res.json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("Erro senha:", error);
    return res.status(500).json({ error: "Erro ao alterar senha" });
  }
});

export default router;