import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'
import { PartnerLeadForm } from '@/components/admin/partner-lead-form'
import { CopyRefLink } from '@/components/admin/copy-ref-link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Statuts LISIBLES pour le partner — jamais de détails financiers du client.
const PARTNER_STATUS: Record<string, string> = {
  NOUVEAU: 'Reçu',
  CONTACTE: 'Contacté',
  RDV: 'Contacté',
  DOSSIER_EN_COURS: 'Dossier en cours',
  DOSSIER_COMPLET: 'Dossier en cours',
  ENVOYE_PARTENAIRE: 'Dossier en cours',
  OFFRES_RECUES: 'Dossier en cours',
  SIGNE: 'Signé',
  PERDU: 'Sans suite',
  NURTURING: 'En surveillance',
}

export async function PartnerHome({ partnerId }: { partnerId: string }) {
  const partner = await prisma.user.findUniqueOrThrow({
    where: { id: partnerId },
    select: { partnerCode: true, partnerApprovedAt: true },
  })
  const leads = await prisma.lead.findMany({
    where: { partnerId }, // étanchéité : uniquement SES apports
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, name: true, status: true, createdAt: true },
  })

  const refLink = `${BASE_URL}/fr?ref=${partner.partnerCode ?? ''}`

  return (
    <div className="space-y-6">
      {!partner.partnerApprovedAt ? (
        <p className="border-ambre-500 bg-ambre-50 text-ambre-700 rounded-xl border p-4 text-sm">
          Votre compte apporteur est en attente de validation par notre équipe. Vous pouvez déjà
          envoyer des clients : ils seront traités dès la validation.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Envoyer un client */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Envoyer un client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            <PartnerLeadForm />
          </CardContent>
        </Card>

        {/* Lien personnel + QR */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Votre lien personnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <p className="text-ink-700 text-sm">
              Chaque client qui passe par ce lien (ou scanne le QR) vous est automatiquement
              rattaché.
            </p>
            <CopyRefLink url={refLink} />
            <Button asChild variant="outline" size="sm">
              <a href="/api/partner/qr" download="hypopilot-qr.png">
                Télécharger le QR code
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ses leads, statut lisible, zéro détail financier */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Vos clients envoyés</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {leads.length === 0 ? (
            <p className="text-ink-500 py-8 text-center text-sm">
              Aucun client envoyé pour l’instant.
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{lead.name ?? '—'}</span>
                  <span className="text-data text-ink-500">{formatDate(lead.createdAt)}</span>
                  <Badge
                    variant="secondary"
                    className={lead.status === 'SIGNE' ? 'bg-pilot-100 text-pilot-700' : ''}
                  >
                    {PARTNER_STATUS[lead.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
