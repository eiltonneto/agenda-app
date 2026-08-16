# 🌱 Fluxo de desenvolvimento

Este projeto usa 3 níveis de branch, cada um com seu próprio ambiente:

```text
feature/* , fix/*  →  develop  →  main
   (seu PC)         (ambiente     (produção)
                      "dev")
```

| Branch | Onde roda | Banco de dados | Propósito |
|---|---|---|---|
| `feature/*`, `fix/*` | Seu PC (`docker compose up`) | Postgres local (Docker) | Desenvolver e testar isoladamente |
| `develop` | Vercel — URL fixa de preview (ver setup abaixo) | Postgres **dev** (Render, separado do de produção) | Testar tudo integrado antes de liberar |
| `main` | Vercel + Render — produção | Postgres de **produção** (Render) | O que os usuários finais usam |

> ⚠️ Nunca aponte o ambiente `develop` para o banco de produção. Um bug ou uma migration ruim testada em `develop` não pode arriscar dado real.

---

## 🔁 Fluxo do dia a dia

### 1. Nova feature ou correção
Sempre a partir da `develop` atualizada:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-feature
```

Use `feature/` para o que for novo e `fix/` para correções pontuais — mantém o padrão que vocês já usam nas mensagens de commit (`fix:`, `refactor:`, etc).

### 2. Ao terminar, abra PR para `develop`

```bash
git push -u origin feature/nome-da-feature
gh pr create --base develop --title "feat: nome da feature" --body "Descrição curta do que mudou"
```

### 3. Depois do merge, valide no ambiente dev
A Vercel faz o deploy automático da `develop` assim que o PR é mergeado. Teste manualmente na URL de dev (ver setup abaixo) antes de seguir.

### 4. Só depois disso, promova para produção

```bash
gh pr create --base main --head develop --title "release: <resumo do que vai pra produção>"
```

Esse PR final é o ponto de checagem antes de qualquer coisa chegar nos usuários.

---

## 🛠️ Configuração única (feita uma vez, manualmente)

Estes passos precisam ser feitos direto nos dashboards (Vercel / GitHub / Render) — não dá pra automatizar por aqui.

### A. Banco de dados de "dev" separado (Render)
1. No [Render Dashboard](https://dashboard.render.com), crie um **novo** Postgres (plano free), com nome tipo `agendaapp-db-dev`.
2. Copie a **External Connection String** gerada.
3. Guarde — vai ser usada no passo C.

### B. URL fixa da Vercel para a branch `develop`
**Você não precisa configurar nada aqui.** A Vercel já gera automaticamente uma URL fixa pra qualquer branch com deploy (a `develop` já aparece em "Active Branches"), no formato:

```text
<nome-do-projeto>-git-develop-<seu-scope>.vercel.app
```

Essa URL não muda a cada commit — sempre aponta pro deploy mais recente da `develop`. Pra descobrir a URL exata: vá em **Deployments**, ache um deployment feito a partir da `develop` e copie a URL mostrada nele, ou clique em "**Visit Preview**" no comentário que a Vercel deixa automaticamente em qualquer PR que tocou nessa branch.

Só configure um domínio customizado (ex: `dev.seudominio.com`) se quiser algo mais bonito — é puramente cosmético:
1. **Settings → Domains** (dentro do projeto, não da conta/team).
2. **Add Domain**.
3. No dropdown **Edit** do domínio adicionado → **Connect to an environment** → **Preview** → campo **Git Branch** → `develop`.

### C. Variáveis de ambiente por branch na Vercel
O campo pra restringir uma variável a uma branch específica fica escondido/varia de lugar no dashboard dependendo da versão da UI. O caminho confiável hoje é pela **Vercel CLI** (é o que a própria documentação da Vercel recomenda para esse caso):

```bash
npm i -g vercel     # se ainda não tiver
vercel login
vercel link         # roda dentro da pasta do backend, conecta ao projeto certo
```

Depois, para cada variável, adicione uma versão restrita à branch `develop` (o comando pede o valor via prompt):

```bash
vercel env add DATABASE_URL preview develop
vercel env add JWT_SECRET preview develop
vercel env add CLOUDINARY_CLOUD_NAME preview develop
vercel env add CLOUDINARY_API_KEY preview develop
vercel env add CLOUDINARY_API_SECRET preview develop
```

- `DATABASE_URL` → cole a connection string do Postgres de **dev** criado no passo A (não a de produção!).
- `JWT_SECRET` → pode repetir o mesmo valor ou usar outro, tanto faz (não protege dado real).
- `CLOUDINARY_*` → se quiser mídia separada da de produção, crie uma pasta/preset de dev; senão, reaproveite as mesmas chaves de produção.

Uma variável adicionada assim (`preview develop`) só se aplica a deployments da branch `develop` — as demais branches de preview e a produção continuam usando os valores que já têm. Pra conferir o que ficou configurado:

```bash
vercel env ls preview
```

Se preferir tentar pelo dashboard mesmo assim: **Settings → Environment Variables → Add New**, marque o ambiente **Preview** e procure uma opção de "branch específica" que aparece depois de marcar Preview (o nome/posição desse campo varia). Se não achar, a CLI acima é o caminho garantido.

Confirme por último que os valores de **Production** continuam apontando para o banco de produção do Render, sem mudança.

### D. Proteger a branch `main` no GitHub
1. **Repositório → Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. Marque **Require a pull request before merging**.
4. Salve.

A partir daqui, ninguém (nem você, via `git push origin main` direto) consegue enviar código pra produção sem passar por um Pull Request.

---

## 🚑 Hotfix urgente em produção

Se algo quebrar em produção e não dá pra esperar o fluxo normal:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/nome-do-problema
# corrige, commita
gh pr create --base main --title "hotfix: nome do problema"
```

Depois do merge na `main`, **traga a correção de volta pra `develop`** pra não perder o fix na próxima promoção:

```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```
