'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  CAMPAGNE_COOKIE,
  campagneToken,
  checkCampagneCredentials,
} from '@/lib/campagne'

export type CampagneLoginState = { error?: boolean }

export async function campagneLogin(
  _prev: CampagneLoginState,
  formData: FormData
): Promise<CampagneLoginState> {
  const user = String(formData.get('user') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!checkCampagneCredentials(user, password)) return { error: true }

  const store = await cookies()
  store.set(CAMPAGNE_COOKIE, campagneToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/campagne',
    maxAge: 60 * 60 * 8, // 8 h
  })
  redirect('/campagne/leads')
}

export async function campagneLogout() {
  const store = await cookies()
  store.delete(CAMPAGNE_COOKIE)
  redirect('/campagne')
}
