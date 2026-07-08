'use server'

import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import type { Locale } from '@/i18n/routing'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DossierError,
  assertCanEditDossier,
  saveDossierVersion,
} from '@/server/dossier/versioning'

// ─── Actions du wizard /dossier ────────────────────────────────────────
// Le dossier anonyme est identifié par son uuid (possession = accès, comme
// un brouillon). Un utilisateur connecté du panel écrit avec son rôle réel.

const saveSchema = z.object({
  dossierId: z.string().uuid().or(z.string().min(8).max(64)),
  funnel: z.enum(['ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID']),
  data: z.unknown(),
  commentaire: z.string().max(500).optional(),
})

export type SaveDossierResult =
  | { ok: true; versionNumero: number; completude: number; complex: boolean }
  | { ok: false; error: 'invalid' | 'tranches' | 'commentaire' | 'forbidden' | 'server' }

export async function saveDossierAction(
  input: z.infer<typeof saveSchema>
): Promise<SaveDossierResult> {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale
  const session = await auth()

  // Auteur : rôle interne si connecté au panel, sinon LEAD (wizard public).
  const role = session?.user?.role
  const author =
    role === 'ADMIN' || role === 'CLOSER'
      ? {
          type: role as 'ADMIN' | 'CLOSER',
          id: session!.user.id,
          name: session!.user.name ?? role,
        }
      : { type: 'LEAD' as const, name: 'Client' }

  try {
    if (author.type !== 'LEAD') {
      await assertCanEditDossier({ id: author.id!, role: author.type }, parsed.data.dossierId)
    }
    const saved = await saveDossierVersion({
      dossierId: parsed.data.dossierId,
      funnel: parsed.data.funnel,
      locale,
      data: parsed.data.data,
      author,
      commentaire: parsed.data.commentaire ?? null,
    })
    return {
      ok: true,
      versionNumero: saved.version.numero,
      completude: saved.completeness.percent,
      complex: saved.dossier.complex,
    }
  } catch (error) {
    if (error instanceof DossierError) {
      return {
        ok: false,
        error: error.code === 'not-found' ? 'server' : error.code,
      }
    }
    console.error('saveDossierAction', error)
    return { ok: false, error: 'server' }
  }
}

/** Événement wizard (step completed, offers viewed…) — fire and forget. */
const eventSchema = z.object({
  dossierId: z.string().min(8).max(64),
  type: z.enum(['WIZARD_STEP_COMPLETED', 'WIZARD_ABANDONED', 'OFFERS_VIEWED']),
  data: z.record(z.string(), z.unknown()).optional(),
})

export async function trackDossierEvent(input: z.infer<typeof eventSchema>): Promise<void> {
  const parsed = eventSchema.safeParse(input)
  if (!parsed.success) return
  try {
    const exists = await prisma.dossier.findUnique({
      where: { id: parsed.data.dossierId },
      select: { id: true },
    })
    if (!exists) return
    await prisma.dossierEvent.create({
      data: {
        dossierId: parsed.data.dossierId,
        type: parsed.data.type,
        data: parsed.data.data as Prisma.InputJsonValue | undefined,
        actorType: 'LEAD',
      },
    })
    await prisma.dossier.update({
      where: { id: parsed.data.dossierId },
      data: { lastActivityAt: new Date() },
    })
  } catch (error) {
    console.error('trackDossierEvent', error)
  }
}
