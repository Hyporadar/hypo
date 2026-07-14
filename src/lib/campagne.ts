import 'server-only'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// Auth ultra-simple du panel de test /campagne : un seul identifiant +
// mot de passe (env). Session = cookie httpOnly contenant un jeton dérivé
// du mot de passe. Aucun rôle, aucune table User — c'est un outil interne
// jetable pour lire les leads de campagne.

const USER = process.env.CAMPAGNE_USER ?? 'admin'
const PASSWORD = process.env.CAMPAGNE_PASSWORD ?? 'hypopilot-test'
export const CAMPAGNE_COOKIE = 'campagne_session'

function token(): string {
  return createHash('sha256').update(`campagne:${PASSWORD}`).digest('hex')
}

export function checkCampagneCredentials(user: string, password: string): boolean {
  return user === USER && password === PASSWORD
}

export function campagneToken(): string {
  return token()
}

export async function isCampagneAuthed(): Promise<boolean> {
  const store = await cookies()
  return store.get(CAMPAGNE_COOKIE)?.value === token()
}
