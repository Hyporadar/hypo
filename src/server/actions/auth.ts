'use server'

import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { redirect as nextRedirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { signIn, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type AuthFormState = {
  error?: string
}

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  password: z.string().min(8).max(200),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('auth.register')

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? undefined,
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: t('invalidData') }
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: t('emailTaken') }
  }

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: 'CLIENT',
      locale, // la langue au moment de l'inscription devient la langue du compte
    },
  })

  await signIn('credentials', {
    email,
    password: parsed.data.password,
    redirect: false,
  })

  redirect({ href: '/app', locale })
  return {}
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('auth.login')

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: t('invalidCredentials') }
  }

  const email = parsed.data.email.toLowerCase()
  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: t('invalidCredentials') }
    }
    throw error
  }

  // Les rôles internes atterrissent sur le panel (hors i18n), les clients sur leur espace.
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } })
  if (user && user.role !== 'CLIENT') {
    nextRedirect('/admin')
  }
  redirect({ href: '/app', locale })
  return {}
}

export async function signOutAction() {
  const locale = (await getLocale()) as Locale
  await signOut({ redirectTo: `/${locale}` })
}
