'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import {
  DossierError,
  assertCanEditDossier,
  restoreVersion,
} from '@/server/dossier/versioning'

// ─── Actions admin sur les dossiers versionnés ─────────────────────────
// Restaurer = créer une NOUVELLE version copie de l'ancienne (rien n'est
// jamais supprimé). Réservé ADMIN + closer assigné.

const restoreSchema = z.object({
  dossierId: z.string().min(8).max(64),
  numero: z.number().int().min(1),
})

export type RestoreResult =
  | { ok: true; versionNumero: number }
  | { ok: false; error: 'forbidden' | 'not-found' | 'server' }

export async function restoreDossierVersionAction(
  input: z.infer<typeof restoreSchema>
): Promise<RestoreResult> {
  const parsed = restoreSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'server' }
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user || (role !== 'ADMIN' && role !== 'CLOSER')) {
    return { ok: false, error: 'forbidden' }
  }

  try {
    await assertCanEditDossier({ id: session.user.id, role }, parsed.data.dossierId)
    const restored = await restoreVersion(parsed.data.dossierId, parsed.data.numero, {
      type: role,
      id: session.user.id,
      name: session.user.name ?? role,
    })
    revalidatePath(`/admin/dossiers/${parsed.data.dossierId}`)
    return { ok: true, versionNumero: restored.version.numero }
  } catch (error) {
    if (error instanceof DossierError) {
      return { ok: false, error: error.code === 'not-found' ? 'not-found' : 'forbidden' }
    }
    console.error('restoreDossierVersionAction', error)
    return { ok: false, error: 'server' }
  }
}
