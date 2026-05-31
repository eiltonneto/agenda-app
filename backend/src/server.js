import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; 
import { fileURLToPath } from "url"; // IMPORTANTE: Ferramenta do Node moderno

// IMPORTAÇÕES DE ROTAS
import usuariosRoutes from "./routes/usuarios.routes.js"; 
import authRoutes from "./routes/auth.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";
import notificacoesRoutes from "./routes/notificacoes.routes.js";
import receitasRoutes from "./routes/receitas.routes.js";
import despesasRoutes from "./routes/despesas.routes.js";
import bootstrapRoutes from "./routes/bootstrap.routes.js";

import { authMiddleware } from "./middlewares/auth.js"; 

import fs from 'fs';
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Recriando o __dirname para trabalhar com ED Modules (import/export) - Isso é necessário para servir arquivos estáticos e lidar com uploads de forma correta. Sem isso, o caminho para a pasta 'uploads' ficaria quebrado e causaria erros ao tentar acessar ou salvar arquivos.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// ROTAS PÚBLICAS (Abertas) 

// Robô de ping para manter o servidor da Render acordado (Hospedagem gratuíta) 
app.get("/ping", (req, res) => {
  return res.status(200).send("pong");
});

app.use("/login", authRoutes);    
app.use("/usuarios", usuariosRoutes); 

// Libera o acesso público à pasta uploads
// O caminho '..' faz ele sair da pasta 'src' e procurar a pasta 'uploads' na raiz
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));


// PROTEÇÃO GLOBAL
app.use(authMiddleware); 

// ROTAS PROTEGIDAS (REQUEREM AUTENTICAÇÃO JWT)
app.use("/bootstrap", bootstrapRoutes);
app.use("/eventos", eventosRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/notificacoes", notificacoesRoutes);
app.use("/receitas", receitasRoutes);
app.use("/despesas", despesasRoutes);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`✅ YourFlow rodando em: http://localhost:${PORT}`);
});