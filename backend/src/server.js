import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; // <--- Importante para lidar com caminhos de pasta

// Importação das Rotas
import authRoutes from "./routes/auth.routes.js";
import receitasRoutes from "./routes/receitas.routes.js";
import despesasRoutes from "./routes/despesas.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
import notificacoesRoutes from "./routes/notificacoes.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js"; // <--- NOVA ROTA

// Importação do Middleware de Autenticação
import { authMiddleware } from "./middlewares/auth.js"; // <--- NOVO

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO PARA SERVIR FOTOS ---
// Isso permite acessar http://localhost:3333/uploads/nome-da-foto.jpg
app.use("/uploads", express.static(path.resolve("uploads")));

// Rota Raiz
app.get("/", (req, res) => {
  res.json({ message: "ClubApp API funcionando 🚀" });
});

// --- ROTAS PÚBLICAS (Não precisa de token) ---
app.use("/auth", authRoutes);

// --- ROTAS PROTEGIDAS (Precisa estar logado) ---
// O authMiddleware garante que req.userId esteja disponível
app.use("/usuarios", authMiddleware, usuariosRoutes); // <--- Resolve o problema de Perfil/Senha
app.use("/receitas", authMiddleware, receitasRoutes);
app.use("/despesas", authMiddleware, despesasRoutes);
app.use("/eventos", authMiddleware, eventosRoutes);
app.use("/notificacoes", authMiddleware, notificacoesRoutes);
app.use("/financeiro", authMiddleware, financeiroRoutes);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});