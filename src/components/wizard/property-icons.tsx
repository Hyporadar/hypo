'use client'

import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type PropertyIconType =
  | 'maison'
  | 'appartement-ppe'
  | 'maison-mitoyenne'
  | 'immeuble'
  | 'position-individuelle'
  | 'position-jumelee'
  | 'position-mitoyenne-centrale'
  | 'position-mitoyenne-angle'
  | 'baignoire'
  | 'douche'
  | 'wc'

/* Deux couleurs seulement : trait encre (currentColor) et accent vert pilote.
   Les éléments voisins non concernés passent en trait gris clair. */
const accentFill = 'var(--color-pilot-200)'
const accentStroke = 'var(--color-pilot-600)'
const neighborStroke = 'var(--color-line-strong)'

const icons: Record<PropertyIconType, ReactElement> = {
  /* Petite maison avec porte accent et arbre à côté. */
  maison: (
    <>
      <path d="M4 40h40" />
      <path d="M6 40V24l10-11 10 11v16" />
      <rect x="13" y="32" width="6" height="8" fill={accentFill} />
      <circle cx="38" cy="24" r="6" />
      <path d="M38 30v10" />
    </>
  ),
  /* Immeuble de 3 étages, étage du milieu en accent. */
  'appartement-ppe': (
    <>
      <rect x="15" y="18" width="18" height="12" fill={accentFill} stroke="none" />
      <rect x="15" y="6" width="18" height="36" />
      <path d="M15 18h18M15 30h18" />
      <path d="M20 12h3M25 12h3M20 24h3M25 24h3M20 36h3M25 36h3" />
      <path d="M11 42h26" />
    </>
  ),
  /* 3 maisons accolées en escalier, celle du centre en accent. */
  'maison-mitoyenne': (
    <>
      <path d="M3 40h42" />
      <path d="M5 40V30l6.5-7 6.5 7v10" stroke={neighborStroke} />
      <path d="M31 40V22l6.5-7 6.5 7v18" stroke={neighborStroke} />
      <path d="M18 40V26l6.5-8 6.5 8v14z" fill={accentFill} />
    </>
  ),
  /* Longue barre d'immeuble avec grille de fenêtres. */
  immeuble: (
    <>
      <path d="M3 40h42" />
      <rect x="5" y="14" width="38" height="26" />
      <rect x="21" y="33" width="6" height="7" fill={accentFill} />
      <rect x="10" y="18" width="4" height="4" />
      <rect x="18" y="18" width="4" height="4" />
      <rect x="26" y="18" width="4" height="4" />
      <rect x="34" y="18" width="4" height="4" />
      <rect x="10" y="26" width="4" height="4" />
      <rect x="18" y="26" width="4" height="4" />
      <rect x="26" y="26" width="4" height="4" />
      <rect x="34" y="26" width="4" height="4" />
    </>
  ),
  /* Maison seule, remplie en accent. */
  'position-individuelle': (
    <>
      <path d="M8 40h32" />
      <path d="M12 40V22l12-12 12 12v18z" fill={accentFill} />
    </>
  ),
  /* 2 maisons accolées, celle de gauche en accent. */
  'position-jumelee': (
    <>
      <path d="M4 40h40" />
      <path d="M24 40V24l9-10 9 10v16" stroke={neighborStroke} />
      <path d="M6 40V24l9-10 9 10v16z" fill={accentFill} />
    </>
  ),
  /* 3 maisons accolées, celle du centre en accent. */
  'position-mitoyenne-centrale': (
    <>
      <path d="M3 40h42" />
      <path d="M5 40V26l6.5-9 6.5 9v14" stroke={neighborStroke} />
      <path d="M31 40V26l6.5-9 6.5 9v14" stroke={neighborStroke} />
      <path d="M18 40V26l6.5-9 6.5 9v14z" fill={accentFill} />
    </>
  ),
  /* 3 maisons accolées, celle de gauche (angle) en accent. */
  'position-mitoyenne-angle': (
    <>
      <path d="M3 40h42" />
      <path d="M18 40V26l6.5-9 6.5 9v14" stroke={neighborStroke} />
      <path d="M31 40V26l6.5-9 6.5 9v14" stroke={neighborStroke} />
      <path d="M5 40V26l6.5-9 6.5 9v14z" fill={accentFill} />
    </>
  ),
  /* Baignoire au trait, goutte du robinet en accent. */
  baignoire: (
    <>
      <path d="M6 26h36v3a9 9 0 0 1-9 9H15a9 9 0 0 1-9-9z" />
      <path d="M10 26V12a4 4 0 0 1 8 0" />
      <path d="M18 16v3" stroke={accentStroke} />
      <path d="M14 38v4M34 38v4" />
    </>
  ),
  /* Pomme de douche au trait, jets d'eau en accent. */
  douche: (
    <>
      <path d="M24 4v4" />
      <path d="M15 17a9 9 0 0 1 18 0" />
      <path d="M13 17h22" />
      <path d="M17 23v4M24 23v4M31 23v4M17 33v4M24 33v4M31 33v4" stroke={accentStroke} />
    </>
  ),
  /* WC au trait (profil), eau de la cuvette en accent. */
  wc: (
    <>
      <rect x="16" y="7" width="14" height="8" rx="1" />
      <path d="M14 19h20" />
      <path d="M16 19v3a10 10 0 0 0 10 10h4v8H20" />
      <path d="M20 25h5" stroke={accentStroke} />
    </>
  ),
}

/** Pictogramme immobilier du wizard — SVG inline, trait 2px, accent vert pilote. */
export function PropertyIcon({ type, className }: { type: PropertyIconType; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('text-ink-700', className)}
    >
      {icons[type]}
    </svg>
  )
}
