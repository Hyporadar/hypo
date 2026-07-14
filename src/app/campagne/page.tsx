import { redirect } from 'next/navigation'
import { isCampagneAuthed } from '@/lib/campagne'
import { CampagneLoginForm } from '@/components/campagne/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CampagnePage() {
  if (await isCampagneAuthed()) redirect('/campagne/leads')

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Leads de campagne</CardTitle>
          <CardDescription>Accès réservé — outil de suivi des tests Google Ads.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampagneLoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
