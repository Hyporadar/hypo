import { prisma } from '@/lib/prisma'

// Collecte des événements anonymes de l'entonnoir. Appelé en fire-and-forget
// (sendBeacon) par le navigateur. Aucune donnée personnelle : id de session
// aléatoire + nom d'étape. La contrainte d'unicité (sessionId, step) fait la
// déduplication (un visiteur compté une seule fois par étape).

const STEPS = new Set(['visit', 'criteria', 'advance', 'contact'])

export async function POST(req: Request) {
  try {
    const { sessionId, step } = (await req.json()) as { sessionId?: unknown; step?: unknown }
    if (typeof sessionId !== 'string' || !sessionId || typeof step !== 'string' || !STEPS.has(step)) {
      return Response.json({ ok: false }, { status: 400 })
    }
    await prisma.funnelEvent.createMany({
      data: [{ sessionId: sessionId.slice(0, 64), step }],
      skipDuplicates: true,
    })
    return Response.json({ ok: true })
  } catch {
    // Best-effort : on n'échoue jamais bruyamment côté client.
    return Response.json({ ok: false }, { status: 200 })
  }
}
