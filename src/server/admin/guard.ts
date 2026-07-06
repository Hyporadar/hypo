import 'server-only'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'

// ─── Garde RBAC du panel /admin ────────────────────────────────────────
// Le proxy filtre déjà l'entrée du panel ; chaque page ET chaque action
// revérifient côté serveur (défense en profondeur + étanchéité par rôle).

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await auth()
  if (!session?.user) redirect('/fr/connexion')
  if (!roles.includes(session.user.role)) {
    // Un rôle interne non autorisé retombe sur sa home de panel ;
    // un client sur son espace.
    redirect(session.user.role === 'CLIENT' ? `/${session.user.locale}/app` : '/admin')
  }
  return session
}

/** Clause de scoping des leads pour un closer : uniquement les siens. */
export function closerLeadsWhere(closerId: string) {
  return { closerId }
}

/** Clause de scoping des leads pour un partner : uniquement ses apports. */
export function partnerLeadsWhere(partnerId: string) {
  return { partnerId }
}
