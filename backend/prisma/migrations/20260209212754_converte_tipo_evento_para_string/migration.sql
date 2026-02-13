-- 1. A MÁGICA: Converte a coluna 'tipo' de Enum para Texto
-- O comando 'USING "tipo"::text' pega o valor antigo (ex: LAZER) e transforma em texto
ALTER TABLE "Evento" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- 2. Cria a coluna senha na tabela Usuario (se ela ainda não existir)
-- Isso garante que o login novo funcione sem quebrar o usuário do seu tio
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "senha" TEXT;

-- 3. (Opcional) Remove o tipo "Enum" antigo do banco para limpar a sujeira
DROP TYPE IF EXISTS "TipoEvento";