# CI/CD do YourFlow

## Visão geral

Este projeto usa uma esteira simples e separada por ambiente:

- `feature/*` e `fix/*` → desenvolvimento local
- `develop` → ambiente de desenvolvimento em Preview
- `main` → ambiente de produção

## Arquitetura por ambiente

### Local

- Banco: PostgreSQL via Docker Compose
- Backend: `docker compose up --build`
- Frontend mobile: `npx expo start`
- Variáveis: `backend/.env`, `clubapp-mobile/.env` (opcional)

### Desenvolvimento (`develop`)

- Frontend: Vercel Preview
- Backend: Render service de desenvolvimento
- Banco: Neon branch de desenvolvimento
- URL típica:
  - Frontend: URL gerada pela Vercel
  - Backend: `https://agenda-app-dev.onrender.com`

### Produção (`main`)

- Frontend: Vercel Production
- Backend: Render service de produção
- Banco: Neon branch de produção
- URL típica:
  - Frontend: `https://agenda-app-wheat.vercel.app`
  - Backend: `https://agenda-app-i8nj.onrender.com`

---

## Fluxo de branch

```text
feature/* ou fix/*
        ↓
      develop
        ↓
        main
```

## Regra de ambiente

### Vercel

- `develop` → Preview
- `main` → Production
- `EXPO_PUBLIC_API_URL` deve apontar para o backend correto de cada ambiente.

Exemplo:

```text
Preview / develop: EXPO_PUBLIC_API_URL=https://agenda-app-dev.onrender.com
Production / main: EXPO_PUBLIC_API_URL=https://agenda-app-i8nj.onrender.com
```

### Render

- O backend de `develop` deve usar um `DATABASE_URL` do Neon de desenvolvimento.
- O backend de `main` deve usar um `DATABASE_URL` do Neon de produção.
- `JWT_SECRET` deve ser distinto entre dev e prod.

### Neon

- Banco de desenvolvimento: branch/dev do projeto Neon para `develop`
- Banco de produção: branch/projeto principal do Neon para `main`

---

## Configuração de variáveis

### Frontend (Vercel)

A Vercel apenas recebe:

```text
EXPO_PUBLIC_API_URL
```

Nunca deve receber:

```text
DATABASE_URL
JWT_SECRET
CLOUDINARY_*
```

### Backend (Render)

No Render, o backend recebe:

```text
DATABASE_URL
JWT_SECRET
PORT
```

O Cloudinary foi removido do caminho de produção por enquanto e não precisa estar ativo para a esteira funcionar.

---

## Deploy de desenvolvimento

1. Crie ou atualize a branch `develop`.
2. Faça o PR para `develop`.
3. O Vercel gera um deployment Preview automaticamente.
4. Teste o frontend Preview e a API de desenvolvimento.
5. Confirme que os dados usados estão no banco Neon de desenvolvimento.

Validação recomendada:

```bash
curl https://agenda-app-dev.onrender.com/ping
```

Resposta esperada:

```text
pong
```

---

## Deploy de produção

1. Valide tudo em `develop`.
2. Abra PR de `develop` para `main`.
3. Faça o merge na `main`.
4. O Vercel gera deployment de Production.
5. O Render produção recebe o backend da `main`.
6. Confirme a API pública e o frontend web.

Validação recomendada:

```bash
curl https://agenda-app-i8nj.onrender.com/ping
```

Resposta esperada:

```text
pong
```

---

## Checklist de saúde da esteira

Antes de considerar a pipeline estável, confirme:

- `develop` faz deploy Preview com sucesso
- `main` faz deploy Production com sucesso
- `EXPO_PUBLIC_API_URL` aponta para o backend certo em cada ambiente
- `DATABASE_URL` do Render é o Neon certo para cada ambiente
- `JWT_SECRET` é diferente entre dev e prod
- A API pública responde `pong`
- O frontend acessa o backend correto

---

## Observações importantes

- O Vercel não deve hospedar o backend Express.
- O Render não deve rodar `npm run dev` em produção; o serviço deve inicializar com migrações e `npm start`.
- O Preview e a Production devem usar bancos separados para evitar apagar dados de produção acidentalmente.
- O Cloudinary pode ser reativado depois, mas não é bloqueador para a esteira principal.
