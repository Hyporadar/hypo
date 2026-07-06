import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Panel interne — HypoPilot',
  robots: { index: false },
}

const ROLE_SCOPE: Record<string, string> = {
  CLOSER: 'Votre file de leads, votre agenda et vos statistiques arrivent ici.',
  PARTNER: 'Vos leads apportés et vos commissions arrivent ici.',
  ADMIN: 'Leads, utilisateurs, barèmes et taux de référence arrivent ici.',
}

export default async function AdminHomePage() {
  const session = await auth()
  const role = session?.user.role ?? 'CLOSER'

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Panel interne</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="font-display text-lg">Bienvenue</CardTitle>
        </CardHeader>
        <CardContent className="text-ink-700 text-sm leading-relaxed">
          {ROLE_SCOPE[role]}
        </CardContent>
      </Card>
    </div>
  )
}
