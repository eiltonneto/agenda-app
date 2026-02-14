import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import path from "path";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js"; 

const router = Router();

// --- CONFIGURAÇÃO DO MULTER ---
const upload = multer({
  storage: multer.diskStorage({
    // Define a pasta de destino (na raiz do seu backend)
    destination: (req, file, cb) => {
      cb(null, path.resolve("uploads")); 
    },
    // Cria um nome único para a foto, removendo espaços
    filename: (req, file, cb) => {
      const nomeSemEspaco = file.originalname.replace(/\s/g, '_');
      const fileName = `${Date.now()}-${nomeSemEspaco}`;
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
      data: { nome, email, senhaHash }, 
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

// --- ROTA: Atualizar Foto de Perfil ---
router.patch("/foto", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhuma foto enviada." });

    const usuario = await prisma.usuario.update({
      where: { id: req.userId },
      data: { foto: req.file.filename }, // Salva o nome gerado pelo Multer no banco
    });

    const { senhaHash, ...userSemSenha } = usuario;
    return res.json(userSemSenha);
  } catch (error) {
    console.error("Erro na rota de foto:", error);
    return res.status(500).json({ error: "Erro interno ao salvar foto." });
  }
});

// --- ROTA: Alterar Senha ---
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