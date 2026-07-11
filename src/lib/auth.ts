import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
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

// Google OAuth : activé uniquement si les identifiants sont configurés
// (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET). Sinon le bouton n'apparaît pas.
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Connexion Google : on crée le compte CLIENT s'il n'existe pas encore.
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      const email = user.email?.toLowerCase()
      if (!email) return false
      const existing = await prisma.user.findUnique({ where: { email } })
      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? email.split('@')[0] ?? email,
            passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
            role: 'CLIENT',
            locale: 'fr',
          },
        })
      }
      return true
    },
    // role/locale viennent du provider (credentials/magic-link) ou, pour
    // Google, sont chargés depuis notre table User par email.
    async jwt({ token, user, account }) {
      if (user && 'role' in user && user.role) {
        token.id = user.id
        token.role = user.role
        token.locale = user.locale
      } else if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          select: { id: true, role: true, locale: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.locale = dbUser.locale
        }
      }
      return token
    },
  },
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
    ...(googleEnabled ? [Google] : []),
  ],
})
