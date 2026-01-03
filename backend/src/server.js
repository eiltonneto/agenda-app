import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import receitasRoutes from "./routes/receitas.routes.js";
import despesasRoutes from "./routes/despesas.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
import notificacoesRoutes from "./routes/notificacoes.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "ClubApp API funcionando 🚀" });
});

// ... outras rotas ...
app.use("/auth", authRoutes);
app.use("/receitas", receitasRoutes);
app.use("/despesas", despesasRoutes);
app.use("/eventos", eventosRoutes);
app.use("/notificacoes", notificacoesRoutes);
app.use("/financeiro", financeiroRoutes);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
