import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Création / réinitialisation d'un compte admin en prod (la base Neon n'a pas
// été seedée avec les utilisateurs). Protégé par CRON_SECRET ; désactivé si la
// variable n'est pas définie. Idempotent. Endpoint jetable (retiré après usage).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { email?: string; password?: string; name?: string; role?: string } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    // corps optionnel
  }

  const email = (body.email || 'admin@hyporadar.ch').trim().toLowerCase()
  const password = body.password
  if (!password || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'password (>= 8 caractères) requis dans le corps JSON' },
      { status: 400 }
    )
  }

  const roleStr = (body.role || 'ADMIN').toUpperCase()
  const role: Role =
    roleStr === 'CLOSER' ? Role.CLOSER : roleStr === 'PARTNER' ? Role.PARTNER : Role.ADMIN
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: body.name || 'Admin', role, locale: 'fr' },
    update: { passwordHash, role },
  })

  return NextResponse.json({ ok: true, email: user.email, role: user.role })
}
