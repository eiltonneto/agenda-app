# 📱 YourFlow

<img width="654" height="933" alt="image" src="https://github.com/user-attachments/assets/0d935ce5-f2a4-454d-adf0-afc4d515ff71" />
<img width="654" height="933" alt="image" src="https://github.com/user-attachments/assets/8b93490a-51ef-42b5-9941-b35c9662c142" />

O **YourFlow** é uma aplicação para **gestão de clubes e associações**, combinando uma **agenda de eventos** com um **controle financeiro** simples e eficiente.

O projeto foi desenvolvido como **monorepo**, contendo:

- Backend (API)
- Aplicativo Mobile

---

# 🚀 Aplicação em Produção

A API está disponível no Render:

https://agenda-app-i8nj.onrender.com/

O frontend web é exportado pelo Expo e publicado na **Vercel**.

Para saber como funciona o fluxo `feature → develop (dev) → main (produção)`, veja o [CONTRIBUTING.md](CONTRIBUTING.md).

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

```text
yourflow
├── backend
│   ├── prisma
│   ├── src
│   ├── Dockerfile
│   └── package.json
├── clubapp-mobile
│   ├── src
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── backend/.env.example
└── README.md
```

---

# ⚙️ Guia de execução diária

## 1️⃣ Subir o backend e o banco

Abra um terminal na raiz do projeto:

```bash
cd C:\Users\JoseNeto\Projetos\agenda-app
docker compose up --build
```

Se o ambiente já foi criado antes e você só quer ligar novamente:

```bash
docker compose up
```

Isso vai subir:
- PostgreSQL
- backend Node.js
- migrações do Prisma

A API fica disponível em:

```text
http://localhost:3333
```

## 2️⃣ Ver logs do backend

```bash
docker compose logs -f backend
```

## 3️⃣ Parar o ambiente

```bash
docker compose down
```

Se quiser limpar também o banco local:

```bash
docker compose down -v
```

## 4️⃣ Rodar o app mobile

Abra outro terminal:

```bash
cd C:\Users\JoseNeto\Projetos\agenda-app\clubapp-mobile
npm install
npx expo start
```

Depois:
- escaneie o QR Code com o Expo Go
- ou rode em um emulador Android/iOS

## 5️⃣ Arquivo de ambiente do backend

Crie o arquivo `.env` a partir do exemplo:

```bash
cd backend
copy .env.example .env
```

Conteúdo esperado:

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/agendaapp?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3333
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

## 6️⃣ Arquivo de ambiente do mobile (opcional)

Por padrão o app **já escolhe o host certo sozinho**, de acordo com onde está rodando (veja [`src/services/api.js`](clubapp-mobile/src/services/api.js)):

| Onde você está testando | Host usado automaticamente |
|---|---|
| Emulador Android (AVD) | `http://10.0.2.2:3333` |
| Navegador (`expo start` + tecla `w`) | `http://localhost:3333` |
| iOS Simulator | `http://localhost:3333` |
| Celular físico (Expo Go / USB) | precisa do IP da sua máquina — veja abaixo |

Você só precisa criar um `.env` se estiver testando em um **celular físico** na mesma rede Wi-Fi, ou se quiser forçar um host diferente do padrão:

```bash
cd clubapp-mobile
copy .env.example .env
```

Edite o valor com o IP da sua máquina na rede local (verifique com `ipconfig`):

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3333
```

> ⚠️ Se você definir `EXPO_PUBLIC_API_URL`, ele **sempre** tem prioridade sobre a escolha automática — inclusive no navegador. Não deixe um `.env` com `10.0.2.2` esquecido se for testar via `w` (navegador), senão a conexão trava com `ERR_CONNECTION_TIMED_OUT`.

## 7️⃣ Fluxo diário recomendado

### Iniciar o dia
```bash
cd C:\Users\JoseNeto\Projetos\agenda-app
docker compose up --build
```

### Rodar o app
```bash
cd C:\Users\JoseNeto\Projetos\agenda-app\clubapp-mobile
npx expo start
```

### Encerrar o dia
```bash
docker compose down
```

---

# ⚠️ Solução rápida de problemas

## Backend não sobe
```bash
docker compose down -v
docker compose up --build
```

## App não conecta com o backend (Network Error / ERR_CONNECTION_TIMED_OUT)
1. Confirme que o backend está de pé: `docker compose ps` e `curl http://localhost:3333/ping` deve responder `pong`.
2. Se o erro aparece **testando pelo navegador** (`expo start` + tecla `w`): confira se não existe um `clubapp-mobile/.env` forçando `EXPO_PUBLIC_API_URL=http://10.0.2.2:3333` — esse endereço só existe dentro do emulador Android e trava no navegador. Apague a variável ou o arquivo `.env` para voltar ao host automático (`localhost`).
3. Se o erro aparece **num celular físico**: crie/ajuste o `clubapp-mobile/.env` com o IP da sua máquina na rede (`EXPO_PUBLIC_API_URL=http://SEU_IP:3333`), não `localhost` nem `10.0.2.2`.
4. Cadastro/login retornando erro mesmo com o backend online? Confira se `backend/.env` existe e se o `docker-compose.yml` está carregando-o via `env_file` — sem isso o container sobe sem `JWT_SECRET`.

## Porta ocupada
```bash
docker compose ps
```

---

# 📱 Funcionalidades

## 🗓️ Agenda de Eventos
- Visualização de calendário mensal
- Indicadores visuais nos dias com eventos
- Criação, edição e exclusão de eventos
- Prevenção de conflitos de horário

## 💰 Controle Financeiro
- Dashboard com saldo atual
- Registro de receitas e despesas
- Filtro de transações por mês
- Categorização de entradas e saídas
- Previsão de saldo futuro

## 🔐 Autenticação
- Sistema com JWT para autenticação segura entre o aplicativo e a API.

---

# 👨‍💻 Autor

Desenvolvido por Eilton Neto

GitHub: https://github.com/eiltonneto
LinkedIn: https://linkedin.com/in/eilton-neto
