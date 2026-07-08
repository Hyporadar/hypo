import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'

// Désinscription 1 clic — le lien figure dans chaque email de taux.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const subscription = await prisma.rateSubscription.findUnique({
    where: { unsubscribeToken: token },
  })
  if (!subscription) {
    return NextResponse.redirect(new URL('/fr', BASE_URL), 302)
  }

  if (!subscription.unsubscribedAt) {
    await prisma.rateSubscription.update({
      where: { id: subscription.id },
      data: { unsubscribedAt: new Date() },
    })
  }

  return NextResponse.redirect(
    new URL(`/${subscription.locale}?rateAlert=unsubscribed`, BASE_URL),
    302
  )
}
