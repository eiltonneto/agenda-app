import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; 
import { fileURLToPath } from "url"; // 👈 IMPORTANTE: Ferramenta do Node moderno

// --- IMPORTAÇÕES ---
import usuariosRoutes from "./routes/usuarios.routes.js"; 
import authRoutes from "./routes/auth.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";
import notificacoesRoutes from "./routes/notificacoes.routes.js";
import receitasRoutes from "./routes/receitas.routes.js";
import despesasRoutes from "./routes/despesas.routes.js";

import { authMiddleware } from "./middlewares/auth.js"; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MÁGICA DO NODE MODERNO: Recriando o __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Libera o acesso público à pasta uploads
// O caminho '..' faz ele sair da pasta 'src' e procurar a pasta 'uploads' na raiz
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

// --- 1. ROTAS PÚBLICAS (Abertas) ---
app.use("/login", authRoutes);    
app.use("/usuarios", usuariosRoutes); 

// --- 2. PROTEÇÃO GLOBAL ---
app.use(authMiddleware); 

// --- 3. ROTAS PROTEGIDAS ---
app.use("/eventos", eventosRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/notificacoes", notificacoesRoutes);
app.use("/receitas", receitasRoutes);
app.use("/despesas", despesasRoutes);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`✅ YourFlow rodando em: http://localhost:${PORT}`);
});