import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'

// Confirmation double opt-in de l'alerte taux (lien reçu par email).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const subscription = await prisma.rateSubscription.findUnique({
    where: { confirmToken: token },
  })
  if (!subscription) {
    return NextResponse.redirect(new URL('/fr', BASE_URL), 302)
  }

  if (!subscription.confirmedAt) {
    await prisma.rateSubscription.update({
      where: { id: subscription.id },
      data: { confirmedAt: new Date() },
    })
  }

  return NextResponse.redirect(
    new URL(`/${subscription.locale}/dossier?rateAlert=confirmed`, BASE_URL),
    302
  )
}
