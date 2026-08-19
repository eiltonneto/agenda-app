import { Router } from "express";
import prisma from "../database/prisma.js";

const router = Router();
const categoriasPadrao = [
  { nome: "Geral", cor: "#64748b" },
  { nome: "Trabalho", cor: "#3b82f6" },
  { nome: "Lazer", cor: "#10b981" }
];

async function garantirCategoriasPadrao(usuarioId) {
  const existentes = await prisma.categoriaEvento.findMany({
    where: { usuarioId },
    orderBy: { nome: "asc" }
  });

  if (existentes.length > 0) return existentes;

  await prisma.categoriaEvento.createMany({
    data: categoriasPadrao.map(categoria => ({ ...categoria, usuarioId }))
  });

  return prisma.categoriaEvento.findMany({
    where: { usuarioId },
    orderBy: { nome: "asc" }
  });
}

router.get("/", async (req, res) => {
  try {
    return res.json(await garantirCategoriasPadrao(req.userId));
  } catch (error) {
    console.error("Erro ao listar categorias de evento:", error);
    return res.status(500).json({ error: "Erro ao listar categorias." });
  }
});

router.post("/", async (req, res) => {
  const { nome, cor } = req.body;
  if (!nome?.trim() || !cor) return res.status(400).json({ error: "Nome e cor são obrigatórios." });

  try {
    const categoria = await prisma.categoriaEvento.create({
      data: { nome: nome.trim(), cor, usuarioId: req.userId }
    });
    return res.status(201).json(categoria);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Essa categoria já existe." });
    return res.status(500).json({ error: "Erro ao criar categoria." });
  }
});

router.put("/:id", async (req, res) => {
  const { nome, cor } = req.body;
  try {
    const categoria = await prisma.categoriaEvento.updateMany({
      where: { id: String(req.params.id), usuarioId: req.userId },
      data: { nome: nome?.trim(), cor }
    });
    if (categoria.count === 0) return res.status(404).json({ error: "Categoria não encontrada." });
    return res.json(await prisma.categoriaEvento.findUnique({ where: { id: String(req.params.id) } }));
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Essa categoria já existe." });
    return res.status(500).json({ error: "Erro ao atualizar categoria." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const removida = await prisma.categoriaEvento.deleteMany({
      where: { id: String(req.params.id), usuarioId: req.userId }
    });
    if (removida.count === 0) return res.status(404).json({ error: "Categoria não encontrada." });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir categoria." });
  }
});

export { garantirCategoriasPadrao };
export default router;