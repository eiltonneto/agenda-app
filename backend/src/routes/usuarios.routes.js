import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js"; 

const router = Router();

// ☁️ 1. CONFIGURAÇÃO DO CLOUDINARY
// Utiliza as variáveis de ambiente que você configurou no painel do Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ☁️ 2. STORAGE DE NUVEM
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "clubapp_perfil",
    allowedFormats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 500, height: 500, crop: "fill" }],
  },
});

const upload = multer({ storage });

// --- ROTA PÚBLICA: Cadastro de Usuário ---
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

// --- PROTEÇÃO: Exige Token JWT ---
router.use(authMiddleware);

// --- 🚀 ROTA: Atualizar Foto (COM ENCAPSULAMENTO DE ERRO I/O) ---
router.patch("/foto", (req, res, next) => {
  // O invólucro lógico: captura falhas do Cloudinary/Rede antes do Express travar
  upload.single("foto")(req, res, function (err) {
    if (err) {
      console.error("Erro crítico no middleware do Multer/Cloudinary:", err);
      return res.status(502).json({ error: "Falha na comunicação com a nuvem de arquivos. Tente novamente." });
    }
    // Se não houver erro de I/O, avança para a função principal
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhuma foto foi recebida pelo servidor." });

    // No CloudinaryStorage, a URL pronta e segura fica no req.file.path
    const linkDaFotoNuvem = req.file.path;

    const usuario = await prisma.usuario.update({
      where: { id: req.userId },
      data: { foto: linkDaFotoNuvem }, // Salva o URL (http...) em vez do nome do arquivo
    });

    const { senhaHash, ...userSemSenha } = usuario;
    return res.json(userSemSenha);
  } catch (error) {
    console.error("Erro no banco de dados na rota de foto:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar perfil." });
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