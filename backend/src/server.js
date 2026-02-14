import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; 

// --- IMPORTAÇÕES (Ajustadas conforme image_87ba03.png) ---
import usuariosRoutes from "./routes/usuarios.routes.js"; 
import authRoutes from "./routes/auth.routes.js"; // O arquivo correto é este!
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


const path = require("path");

// Libera o acesso público à pasta uploads
// Quando o app chamar "http://seu-backend.com/uploads/foto.jpg", o Node entrega o arquivo.
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

// --- 1. ROTAS PÚBLICAS (Abertas) ---
app.use("/login", authRoutes);    // Mapeia para POST /login
app.use("/usuarios", usuariosRoutes); // O POST para criar conta deve ser público dentro deste arquivo

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
  console.log(`✅ ClubFlow rodando em: http://localhost:${PORT}`);
});