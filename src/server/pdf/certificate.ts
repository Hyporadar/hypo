import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import type { Certificate } from '@prisma/client'
import { getTranslations } from 'next-intl/server'
import { formatCHF, formatDate, formatRate } from '@/lib/format'
import { BASE_URL } from '@/lib/seo'

// Palette de marque (voir .claude/skills/hypopilot-design)
const INK = rgb(0x21 / 255, 0x1e / 255, 0x1a / 255)
const INK_MUTED = rgb(0x6f / 255, 0x69 / 255, 0x60 / 255)
const GREEN = rgb(0x1b / 255, 0x6b / 255, 0x52 / 255)
const GREEN_DARK = rgb(0x15 / 255, 0x58 / 255, 0x43 / 255)
const GREEN_BG = rgb(0xee / 255, 0xf6 / 255, 0xf0 / 255)
const LINE = rgb(0xe6 / 255, 0xe0 / 255, 0xd4 / 255)

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 56

// WinAnsi ne couvre pas tout l'Unicode : on remplace ce qui dépasse.
function sanitize(text: string): string {
  return text
    .replaceAll('’', "'")
    .replaceAll('≤', 'max.')
    .replaceAll('≥', 'min.')
    .replaceAll('–', '-')
    .replaceAll('→', '->')
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawWrapped(
  page: PDFPage,
  text: string,
  opts: {
    x: number
    y: number
    font: PDFFont
    size: number
    maxWidth: number
    color?: ReturnType<typeof rgb>
    lineHeight?: number
  }
): number {
  const lines = wrap(text, opts.font, opts.size, opts.maxWidth)
  const lh = opts.lineHeight ?? opts.size * 1.45
  let y = opts.y
  for (const line of lines) {
    page.drawText(line, {
      x: opts.x,
      y,
      font: opts.font,
      size: opts.size,
      color: opts.color ?? INK,
    })
    y -= lh
  }
  return y
}

interface CertificateData {
  price: number
  ownFunds: number
  ownFundsPillar2: number
  annualGrossIncome: number
  feasible: boolean
  maxAffordablePrice: number
  rateMin: number
  rateMax: number
  monthly: number
}

/** Génère le PDF du certificat, dans la langue du certificat (User.locale au moment de l'émission). */
export async function renderCertificatePdf(certificate: Certificate): Promise<Uint8Array> {
  const locale = certificate.locale
  const t = await getTranslations({ locale, namespace: 'certificate' })
  const d = certificate.data as unknown as CertificateData

  const doc = await PDFDocument.create()
  doc.setTitle(`${sanitize(t('title'))} ${certificate.number}`)
  doc.setAuthor('HypoRadar')
  const page = doc.addPage(A4)
  const [W, H] = A4
  const contentWidth = W - MARGIN * 2

  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  // ── En-tête : wordmark + numéro / date
  let y = H - MARGIN
  page.drawText('Hypo', { x: MARGIN, y, size: 22, font: bold, color: INK })
  page.drawText('Radar', {
    x: MARGIN + bold.widthOfTextAtSize('Hypo', 22),
    y,
    size: 22,
    font: bold,
    color: GREEN,
  })

  const issued = certificate.createdAt
  const metaRight = [
    `${sanitize(t('number'))} ${certificate.number}`,
    `${sanitize(t('issuedOn'))} ${formatDate(issued)}`,
  ]
  metaRight.forEach((line, i) => {
    const w = regular.widthOfTextAtSize(line, 9.5)
    page.drawText(line, {
      x: W - MARGIN - w,
      y: y + 8 - i * 13,
      size: 9.5,
      font: regular,
      color: INK_MUTED,
    })
  })

  y -= 18
  page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 2, color: GREEN })

  // ── Titre
  y -= 44
  page.drawText(sanitize(t('title')), { x: MARGIN, y, size: 24, font: bold, color: INK })
  y -= 16
  page.drawText(sanitize(t('issuer')), { x: MARGIN, y, size: 9.5, font: regular, color: INK_MUTED })

  // ── Porteur
  y -= 40
  page.drawText(sanitize(t('holder')).toUpperCase(), {
    x: MARGIN,
    y,
    size: 8.5,
    font: bold,
    color: INK_MUTED,
  })
  y -= 18
  page.drawText(sanitize(certificate.holder), { x: MARGIN, y, size: 16, font: bold, color: INK })

  // ── Encadré résultat : capacité maximale
  y -= 34
  const boxH = 76
  page.drawRectangle({
    x: MARGIN,
    y: y - boxH,
    width: contentWidth,
    height: boxH,
    color: GREEN_BG,
    borderColor: GREEN,
    borderWidth: 0.75,
  })
  page.drawText(sanitize(t('maxCapacity')).toUpperCase(), {
    x: MARGIN + 18,
    y: y - 24,
    size: 8.5,
    font: bold,
    color: GREEN_DARK,
  })
  page.drawText(formatCHF(d.maxAffordablePrice), {
    x: MARGIN + 18,
    y: y - 56,
    size: 27,
    font: bold,
    color: GREEN_DARK,
  })
  y -= boxH + 22

  // ── Déclaration de faisabilité
  y = drawWrapped(page, d.feasible ? t('feasible') : t('notFeasible'), {
    x: MARGIN,
    y,
    font: regular,
    size: 10,
    maxWidth: contentWidth,
  })

  // ── Éléments déclarés
  y -= 20
  page.drawText(sanitize(t('summaryTitle')).toUpperCase(), {
    x: MARGIN,
    y,
    size: 8.5,
    font: bold,
    color: INK_MUTED,
  })
  y -= 8
  const rows: Array<[string, string]> = [
    [t('price'), formatCHF(d.price)],
    [t('ownFunds'), formatCHF(d.ownFunds)],
    [`   ${t('ownFundsPillar2')}`, formatCHF(d.ownFundsPillar2)],
    [t('income'), formatCHF(d.annualGrossIncome)],
    [t('rateRange'), `${formatRate(d.rateMin)} - ${formatRate(d.rateMax)}`],
    [t('monthly'), formatCHF(d.monthly)],
  ]
  for (const [label, value] of rows) {
    y -= 22
    page.drawLine({
      start: { x: MARGIN, y: y + 15 },
      end: { x: W - MARGIN, y: y + 15 },
      thickness: 0.5,
      color: LINE,
    })
    page.drawText(sanitize(label), { x: MARGIN, y, size: 10, font: regular, color: INK_MUTED })
    const w = bold.widthOfTextAtSize(sanitize(value), 10.5)
    page.drawText(sanitize(value), { x: W - MARGIN - w, y, size: 10.5, font: bold, color: INK })
  }

  // ── QR de vérification (bas droite) + texte
  const verifyUrl = `${BASE_URL}/verify/${certificate.id}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 240,
    color: { dark: '#211E1A', light: '#FFFFFF' },
  })
  const qrImage = await doc.embedPng(qrDataUrl)
  const qrSize = 84
  const footerTop = 168
  page.drawImage(qrImage, {
    x: W - MARGIN - qrSize,
    y: footerTop - qrSize + 60,
    width: qrSize,
    height: qrSize,
  })

  page.drawText(sanitize(t('verify')), {
    x: MARGIN,
    y: footerTop + 36,
    size: 9,
    font: bold,
    color: INK,
  })
  page.drawText(verifyUrl, {
    x: MARGIN,
    y: footerTop + 22,
    size: 9,
    font: regular,
    color: GREEN_DARK,
  })

  const validUntil = new Date(issued)
  validUntil.setUTCDate(validUntil.getUTCDate() + 90)
  page.drawText(`${sanitize(t('validUntil'))} ${formatDate(validUntil)}`, {
    x: MARGIN,
    y: footerTop + 4,
    size: 9,
    font: regular,
    color: INK_MUTED,
  })

  // ── Disclaimer
  page.drawLine({
    start: { x: MARGIN, y: footerTop - 42 },
    end: { x: W - MARGIN, y: footerTop - 42 },
    thickness: 0.5,
    color: LINE,
  })
  drawWrapped(page, t('disclaimer'), {
    x: MARGIN,
    y: footerTop - 58,
    font: regular,
    size: 7.5,
    maxWidth: contentWidth,
    color: INK_MUTED,
    lineHeight: 10.5,
  })

  return doc.save()
}
