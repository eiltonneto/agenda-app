import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// --- DASHBOARD ---
router.get("/resumo", async (req, res) => {
  try {
    const { mes, ano } = req.query;
    if (!mes || !ano) return res.status(400).json({ error: "Mês e Ano são obrigatórios." });
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);
    const somaReceitas = await prisma.receita.aggregate({ _sum: { valor: true }, where: { usuarioId: req.userId, dataPrevista: { gte: inicio, lte: fim }, status: "RECEBIDA" } });
    const somaDespesas = await prisma.despesa.aggregate({ _sum: { valor: true }, where: { usuarioId: req.userId, dataVencimento: { gte: inicio, lte: fim }, status: "PAGA" } });
    return res.json({ receitas: Number(somaReceitas._sum.valor) || 0, despesas: Number(somaDespesas._sum.valor) || 0, saldo: (Number(somaReceitas._sum.valor) || 0) - (Number(somaDespesas._sum.valor) || 0) });
  } catch (error) { return res.status(500).json({ error: "Erro no resumo." }); }
});

// --- EXCLUSÃO EM MASSA (COM LIMPEZA DE NOTIFICAÇÕES) ---
router.post("/excluir-massa", async (req, res) => {
    try {
        const { ids, tipo } = req.body; // tipo: 'RECEITA' ou 'DESPESA'
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "IDs inválidos." });

        // 1. Apaga notificações vinculadas a esses IDs
        await prisma.notificacao.deleteMany({
            where: {
                referenciaTipo: tipo, // 'RECEITA' ou 'DESPESA'
                referenciaId: { in: ids },
                usuarioId: req.userId
            }
        });

        // 2. Apaga os lançamentos financeiros
        if (tipo === 'RECEITA') {
            await prisma.receita.deleteMany({ where: { id: { in: ids }, usuarioId: req.userId } });
        } else {
            await prisma.despesa.deleteMany({ where: { id: { in: ids }, usuarioId: req.userId } });
        }
        return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: "Erro ao excluir em massa." }); }
});

// --- RECEITAS (CRUD) ---
router.get("/receitas", async (req, res) => {
    const { mes, ano } = req.query;
    const inicio = new Date(ano, mes - 1, 1); const fim = new Date(ano, mes, 0, 23, 59, 59);
    const receitas = await prisma.receita.findMany({ where: { usuarioId: req.userId, dataPrevista: { gte: inicio, lte: fim } }, orderBy: { dataPrevista: 'asc' } });
    return res.json(receitas);
});
router.post("/receitas", async (req, res) => {
    const { descricao, valor, tipo, dataPrevista, status } = req.body;
    if (!descricao || !valor || parseFloat(valor) <= 0) return res.status(400).json({ error: "Dados inválidos." });
    const rec = await prisma.receita.create({ data: { descricao, valor: parseFloat(valor), tipo, dataPrevista, status, usuarioId: req.userId } });
    return res.json(rec);
});
router.put("/receitas/:id", async (req, res) => {
    const { id } = req.params; const { descricao, valor, tipo, dataPrevista, status } = req.body;
    await prisma.receita.update({ where: { id: Number(id), usuarioId: req.userId }, data: { descricao, valor: parseFloat(valor), tipo, dataPrevista, status } });
    return res.json({ ok: true });
});
router.patch("/receitas/:id/status", async (req, res) => {
    const { id } = req.params; const { status } = req.body;
    await prisma.receita.update({ where: { id: Number(id), usuarioId: req.userId }, data: { status } });
    return res.json({ ok: true });
});

// DELETE RECEITA (INDIVIDUAL + NOTIFICAÇÃO)
router.delete("/receitas/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Limpa notificação vinculada
        await prisma.notificacao.deleteMany({
            where: { referenciaTipo: 'RECEITA', referenciaId: id, usuarioId: req.userId }
        });
        // Deleta receita
        await prisma.receita.delete({ where: { id, usuarioId: req.userId } });
        return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: "Erro ao excluir." }); }
});

// --- DESPESAS (CRUD) ---
router.get("/despesas", async (req, res) => {
    const { mes, ano } = req.query;
    const inicio = new Date(ano, mes - 1, 1); const fim = new Date(ano, mes, 0, 23, 59, 59);
    const despesas = await prisma.despesa.findMany({ where: { usuarioId: req.userId, dataVencimento: { gte: inicio, lte: fim } }, orderBy: { dataVencimento: 'asc' } });
    return res.json(despesas);
});
router.post("/despesas", async (req, res) => {
    const { descricao, valor, categoria, dataVencimento, status } = req.body;
    if (!descricao || !valor || parseFloat(valor) <= 0) return res.status(400).json({ error: "Dados inválidos." });
    const desp = await prisma.despesa.create({ data: { descricao, valor: parseFloat(valor), categoria, dataVencimento, status, usuarioId: req.userId } });
    return res.json(desp);
});
router.put("/despesas/:id", async (req, res) => {
    const { id } = req.params; const { descricao, valor, categoria, dataVencimento, status } = req.body;
    await prisma.despesa.update({ where: { id: Number(id), usuarioId: req.userId }, data: { descricao, valor: parseFloat(valor), categoria, dataVencimento, status } });
    return res.json({ ok: true });
});
router.patch("/despesas/:id/status", async (req, res) => {
    const { id } = req.params; const { status } = req.body;
    await prisma.despesa.update({ where: { id: Number(id), usuarioId: req.userId }, data: { status } });
    return res.json({ ok: true });
});

// DELETE DESPESA (INDIVIDUAL + NOTIFICAÇÃO)
router.delete("/despesas/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Limpa notificação vinculada
        await prisma.notificacao.deleteMany({
            where: { referenciaTipo: 'DESPESA', referenciaId: id, usuarioId: req.userId }
        });
        // Deleta despesa
        await prisma.despesa.delete({ where: { id, usuarioId: req.userId } });
        return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: "Erro ao excluir." }); }
});

export default router;