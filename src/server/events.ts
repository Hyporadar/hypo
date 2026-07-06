import 'server-only'
import type { ClientEventType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Module central des événements clients ────────────────────────────
// Chaque action importante du client (ouvre ses offres, revient sur une
// simulation, complète son dossier…) passe par ici. Le moteur de signaux
// (src/server/signals/engine.ts) consomme ces événements pour déclencher
// les appels au bon moment. Ne jamais écrire dans ClientEvent ailleurs.

export interface EmitEventInput {
  type: ClientEventType
  userId?: string | null
  leadId?: string | null
  data?: Prisma.InputJsonValue
}

export async function emitClientEvent(input: EmitEventInput): Promise<void> {
  try {
    await prisma.clientEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        leadId: input.leadId ?? null,
        data: input.data,
      },
    })
  } catch (error) {
    // Un événement perdu ne doit jamais casser le parcours client.
    console.error('emitClientEvent', input.type, error)
  }
}

/** Dernier événement d'un type donné pour un lead (utilisé par les règles de signaux). */
export async function lastEventAt(leadId: string, type: ClientEventType): Promise<Date | null> {
  const event = await prisma.clientEvent.findFirst({
    where: { leadId, type },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  return event?.createdAt ?? null
}
