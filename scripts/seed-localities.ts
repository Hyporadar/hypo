import { readFileSync } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Seed ciblé : remplit SwissLocality (autocomplétion NPA/localité) sans
// toucher au reste. À lancer avec DATABASE_URL pointant sur la base voulue.
const prisma = new PrismaClient()

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

async function main() {
  const data = JSON.parse(
    readFileSync(path.join(process.cwd(), 'prisma', 'data', 'npa-ch.json'), 'utf8')
  ) as Array<{ npa: string; localite: string; canton: string }>

  await prisma.swissLocality.deleteMany()
  const res = await prisma.swissLocality.createMany({
    data: data.map((l) => ({
      npa: l.npa,
      localite: l.localite,
      canton: l.canton,
      recherche: normalize(`${l.npa} ${l.localite} ${l.canton}`),
    })),
    skipDuplicates: true,
  })
  const total = await prisma.swissLocality.count()
  console.log(`SwissLocality : ${res.count} insérées, ${total} au total.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
