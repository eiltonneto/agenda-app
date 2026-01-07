import { Router } from "express";
import prisma from "../database/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// ... (Mantenha as rotas GET /resumo-mes e POST / criacao IGUAIS) ...
// ... (Copie do arquivo anterior até chegar na rota de DELETE individual) ...

// ======================================================
// 📌 RESUMO DO MÊS
// ======================================================
router.get("/resumo-mes", async (req, res) => {
  try {
    const { data } = req.query; 
    if (!data) return res.status(400).json({ error: "Data obrigatória." });
    const dateObj = new Date(data);
    const ano = dateObj.getFullYear();
    const mes = dateObj.getMonth();
    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const eventos = await prisma.evento.findMany({
      where: { usuarioId: req.userId, inicio: { gte: inicioMes.toISOString(), lte: fimMes.toISOString() } },
      select: { inicio: true },
    });
    const datasUnicas = new Set();
    eventos.forEach((ev) => {
      const dataFormatada = new Date(ev.inicio); 
      if (!isNaN(dataFormatada)) datasUnicas.add(dataFormatada.toISOString().split("T")[0]);
    });
    return res.json(Array.from(datasUnicas));
  } catch (error) { return res.status(500).json({ error: "Erro interno." }); }
});

// ======================================================
// 📌 CRIAR EVENTO
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { titulo, tipo, inicio, fim, cor, observacao, lembreteMinutosAntes1, lembreteMinutosAntes2, gerarFinanceiro, valor, tipoFinanceiro } = req.body;

    if (!titulo || !tipo || !inicio || !fim) return res.status(400).json({ error: "Dados obrigatórios faltando." });

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    if (isNaN(inicioDate) || isNaN(fimDate)) return res.status(400).json({ error: "Datas inválidas." });
    if (fimDate <= inicioDate) return res.status(400).json({ error: "Fim deve ser maior que início." });

    const conflito = await prisma.evento.findFirst({
      where: { usuarioId: req.userId, AND: [ { inicio: { lt: fimDate.toISOString() } }, { fim: { gt: inicioDate.toISOString() } } ] },
    });
    if (conflito) return res.status(409).json({ error: "Já existe um evento nesse horário." });

    const evento = await prisma.evento.create({
      data: { titulo, tipo, inicio: inicioDate.toISOString(), fim: fimDate.toISOString(), cor: cor || "#007AFF", observacao, lembreteMinutosAntes1, lembreteMinutosAntes2, usuarioId: req.userId },
    });

    if (gerarFinanceiro && valor) {
        const valorFloat = parseFloat(valor);
        if (!isNaN(valorFloat) && valorFloat > 0) {
            const descricaoFin = `(Agenda) ${titulo}`;
            if (tipoFinanceiro === 'RECEITA') {
                await prisma.receita.create({
                    data: { descricao: descricaoFin, valor: valorFloat, tipo: 'OUTRO', dataPrevista: inicioDate.toISOString(), status: 'PENDENTE', usuarioId: req.userId }
                });
            } else {
                await prisma.despesa.create({
                    data: { descricao: descricaoFin, valor: valorFloat, categoria: 'OUTRO', dataVencimento: inicioDate.toISOString(), status: 'PENDENTE', usuarioId: req.userId }
                });
            }
        }
    }
    return res.status(201).json(evento);
  } catch (error) { return res.status(500).json({ error: "Erro interno." }); }
});

// ... (Mantenha o PUT igual) ...
router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params; const { titulo, tipo, inicio, fim, cor, observacao, lembreteMinutosAntes1 } = req.body;
      const evento = await prisma.evento.update({ where: { id: Number(id), usuarioId: req.userId }, data: { titulo, tipo, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), cor, observacao, lembreteMinutosAntes1 } });
      return res.json(evento);
    } catch (e) { return res.status(500).json({ error: "Erro ao atualizar" }); }
});

// ======================================================
// 📌 EXCLUSÃO EM MASSA (NOVO)
// ======================================================
// Rota de EXCLUSÃO EM MASSA (Atualizada)
router.post("/excluir-massa", async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids) return res.status(400).json({ error: "IDs inválidos" });

        // 1. Limpa Financeiro (lógica anterior...)
        const eventos = await prisma.evento.findMany({ where: { id: { in: ids }, usuarioId: req.userId } });
        for (const ev of eventos) {
            const desc = `(Agenda) ${ev.titulo}`;
            await prisma.receita.deleteMany({ where: { descricao: desc } });
            await prisma.despesa.deleteMany({ where: { descricao: desc } });
        }

        // 2. [NOVO] Limpa Notificações em massa
        await prisma.notificacao.deleteMany({
            where: {
                referenciaTipo: 'EVENTO',
                referenciaId: { in: ids },
                usuarioId: req.userId
            }
        });

        // 3. Deleta Eventos
        await prisma.evento.deleteMany({ where: { id: { in: ids }, usuarioId: req.userId } });
        return res.json({ message: "Sucesso" });
    } catch (e) { return res.status(500).json({ error: "Erro massa" }); }
});

// ... (Mantenha o DELETE individual e GET /dia iguais) ...
router.delete("/:id", async (req, res) => {
  try {
    const idEvento = Number(req.params.id);
    
    // 1. Limpa Financeiro vinculado (já existia)
    const evento = await prisma.evento.findUnique({ where: { id: idEvento } });
    if (evento) {
        const desc = `(Agenda) ${evento.titulo}`;
        await prisma.receita.deleteMany({ where: { descricao: desc, usuarioId: req.userId } });
        await prisma.despesa.deleteMany({ where: { descricao: desc, usuarioId: req.userId } });
    }

    // 2. [NOVO] Limpa Notificações vinculadas a este evento
    await prisma.notificacao.deleteMany({
        where: { 
            referenciaTipo: 'EVENTO', // Certifique-se que ao criar a notificação você salva assim
            referenciaId: idEvento,
            usuarioId: req.userId 
        }
    });

    // 3. Deleta o Evento
    await prisma.evento.delete({ where: { id: idEvento, usuarioId: req.userId } });
    return res.json({ message: "Excluído" });
  } catch (e) { return res.status(500).json({ error: "Erro ao excluir" }); }
});

router.get("/dia/:data", async (req, res) => {
    try {
      const { data } = req.params; const i = new Date(`${data}T00:00:00.000Z`); const f = new Date(`${data}T23:59:59.999Z`);
      const eventos = await prisma.evento.findMany({ where: { usuarioId: req.userId, inicio: { gte: i.toISOString(), lte: f.toISOString() } }, orderBy: { inicio: "asc" } });
      return res.json(eventos);
    } catch (e) { return res.status(500).json({ error: "Erro ao buscar" }); }
});

export default router;