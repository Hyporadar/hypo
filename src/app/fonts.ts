import { Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google'

export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

export const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-spline-mono',
  display: 'swap',
})

export const fontClasses = `${bricolage.variable} ${instrument.variable} ${splineMono.variable}`
