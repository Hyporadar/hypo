'use client'

import { useActionState } from 'react'
import { campagneLogin, type CampagneLoginState } from '@/server/actions/campagne'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CampagneLoginForm() {
  const [state, action, pending] = useActionState<CampagneLoginState, FormData>(campagneLogin, {})

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user">Identifiant</Label>
        <Input id="user" name="user" autoComplete="username" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-erreur text-sm">
          Identifiant ou mot de passe incorrect.
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        Se connecter
      </Button>
    </form>
  )
}
