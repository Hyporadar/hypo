import 'server-only'
import type { Signal } from '@prisma/client'

// ─── NotificationProvider ──────────────────────────────────────────────
// Interface prête pour email/SMS/push ; implémentation console en dev.
// À la création d'un signal prioritaire, le closer assigné est notifié.

export interface SignalNotification {
  closerEmail: string
  closerName: string
  signal: Pick<Signal, 'id' | 'type' | 'priority'>
  leadName: string | null
}

export interface NotificationProvider {
  notifyCloser(notification: SignalNotification): Promise<void>
}

class ConsoleNotificationProvider implements NotificationProvider {
  async notifyCloser(n: SignalNotification): Promise<void> {
    console.log(
      `[notification] → ${n.closerName} <${n.closerEmail}> : signal ${n.signal.type} ` +
        `(priorité ${n.signal.priority}) pour ${n.leadName ?? 'lead sans nom'}`
    )
  }
}

export const notificationProvider: NotificationProvider = new ConsoleNotificationProvider()
