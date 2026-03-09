# 📱 YourFlow

<img width="654" height="933" alt="image" src="https://github.com/user-attachments/assets/0d935ce5-f2a4-454d-adf0-afc4d515ff71" />
<img width="654" height="933" alt="image" src="https://github.com/user-attachments/assets/8b93490a-51ef-42b5-9941-b35c9662c142" />




O **YourFlow** é uma aplicação para **gestão de clubes e associações**, combinando uma **agenda de eventos** com um **controle financeiro** simples e eficiente.

O projeto foi desenvolvido como **monorepo**, contendo:

- Backend (API)
- Aplicativo Mobile

---

# 🚀 Aplicação em Produção

A API está disponível em:

https://agenda-app-wheat.vercel.app/

Deploy realizado utilizando **Vercel**.

---

# 🧰 Tecnologias Utilizadas

## Backend
- Node.js
- Express
- Prisma ORM
- JWT (JSON Web Token)
- PostgreSQL / SQLite
- CORS

## Mobile
- React Native (Expo)
- React Native Calendars
- Date-FNS
- Axios

---

# 📂 Estrutura do Projeto


yourflow
│
├── backend
│ ├── prisma
│ ├── src
│ └── package.json
│
└── clubapp-mobile
├── src
└── package.json


---

# ⚙️ Rodando o Projeto Localmente

## 1️⃣ Backend

Clone o repositório:

```bash
git clone https://github.com/eiltonneto/yourflow
cd yourflow/backend

Instale as dependências:

npm install

Execute as migrations do banco:

npx prisma migrate dev

Inicie o servidor:

npm run dev

O servidor rodará em:

http://localhost:3333
2️⃣ Mobile

Abra outro terminal e execute:

cd clubapp-mobile
npm install
npx expo start

Um QR Code aparecerá no terminal.

Abra o aplicativo Expo Go no celular e escaneie o código.

📡 Configuração de IP (Para rodar no celular)

Celular e computador precisam estar na mesma rede Wi-Fi.

Descubra o IP da sua máquina:

ipconfig

Exemplo:

192.168.0.10

Abra o arquivo:

clubapp-mobile/src/services/api.js

E altere a baseURL:

const api = axios.create({
  baseURL: "http://192.168.0.10:3333"
});
📱 Funcionalidades
🗓️ Agenda de Eventos

Visualização de calendário mensal

Indicadores visuais nos dias com eventos

Criação, edição e exclusão de eventos

Prevenção de conflitos de horário

💰 Controle Financeiro

Dashboard com saldo atual

Registro de receitas e despesas

Filtro de transações por mês

Categorização de entradas e saídas

Previsão de saldo futuro

🔐 Autenticação

O sistema utiliza JWT para autenticação segura entre o aplicativo mobile e a API.

👨‍💻 Autor

Desenvolvido por Eilton Neto

GitHub
https://github.com/eiltonneto

LinkedIn
https://linkedin.com/in/eilton-neto
