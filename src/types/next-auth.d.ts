import type { Locale, Role } from '@prisma/client'
import type { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      locale: Locale
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    locale: Locale
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role
    locale?: Locale
  }
}
