import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.usuario.upsert({
    where: { email: 'teste@email.com' },
    update: {},
    create: {
      nome: 'Usuário Teste',
      email: 'teste@email.com',
      senhaHash: 'sua_senha_hash_aqui', // Use a mesma que você usa no login
      updatedAt: new Date(),
    },
  })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })