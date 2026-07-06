import type { NextAuthConfig } from 'next-auth'

// Config sans dépendance Node (pas de Prisma, pas de bcrypt) :
// partagée entre le proxy (décodage JWT) et l'instance complète.
export const authConfig = {
  session: { strategy: 'jwt' },
  providers: [], // le provider credentials est ajouté dans lib/auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.locale = user.locale
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id
      if (token.role) session.user.role = token.role
      if (token.locale) session.user.locale = token.locale
      return session
    },
  },
} satisfies NextAuthConfig
