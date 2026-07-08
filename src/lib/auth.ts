import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { authConfig } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const magicLinkSchema = z.object({
  token: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locale: user.locale,
        }
      },
    }),
    // Magic link « Sauvegarder mon dossier » : le token (envoyé par email via
    // requestMagicLink) vaut preuve de possession de l'adresse. Usage unique,
    // valable 1h. Crée le compte CLIENT au premier clic et rattache le
    // dossier anonyme. RÈGLE D'OR : le Lead créé ici reste interne — rien
    // n'est poussé vers un partenaire.
    Credentials({
      id: 'magic-link',
      credentials: {
        token: {},
      },
      async authorize(credentials) {
        const parsed = magicLinkSchema.safeParse(credentials)
        if (!parsed.success) return null

        const link = await prisma.magicLinkToken.findUnique({
          where: { token: parsed.data.token },
        })
        if (!link || link.usedAt || link.expiresAt < new Date()) return null

        await prisma.magicLinkToken.update({
          where: { id: link.id },
          data: { usedAt: new Date() },
        })

        const email = link.email.toLowerCase()
        const dossier = link.dossierId
          ? await prisma.dossier.findUnique({ where: { id: link.dossierId } })
          : null

        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          // Pas de mot de passe choisi : hash d'un secret aléatoire, jamais
          // devinable — l'utilisateur pourra en définir un plus tard.
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0] ?? email,
              passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
              role: 'CLIENT',
              locale: dossier?.locale ?? 'fr',
            },
          })
        }

        if (dossier) {
          await prisma.dossier.update({
            where: { id: dossier.id },
            data: { userId: user.id },
          })

          if (!dossier.leadId) {
            const lead = await prisma.lead.create({
              data: {
                funnel: dossier.funnel,
                status: 'NOUVEAU',
                locale: dossier.locale,
                email,
                userId: user.id,
                statusHistory: { create: { fromStatus: null, toStatus: 'NOUVEAU' } },
              },
            })
            await prisma.dossier.update({
              where: { id: dossier.id },
              data: { leadId: lead.id },
            })
          }

          const accountEvent = await prisma.dossierEvent.findFirst({
            where: { dossierId: dossier.id, type: 'ACCOUNT_CREATED' },
            select: { id: true },
          })
          if (!accountEvent) {
            await prisma.dossierEvent.create({
              data: { dossierId: dossier.id, type: 'ACCOUNT_CREATED', actorType: 'LEAD' },
            })
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locale: user.locale,
        }
      },
    }),
  ],
})
