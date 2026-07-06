'use client'

import { useTransition } from 'react'
import { approvePartner, changeUserRole } from '@/server/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ApprovePartnerButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="xs"
      disabled={pending}
      onClick={() => startTransition(async () => void (await approvePartner(userId)))}
    >
      Valider
    </Button>
  )
}

const ROLES = ['CLIENT', 'CLOSER', 'PARTNER', 'ADMIN'] as const

export function RoleSelect({
  userId,
  role,
  disabled = false,
}: {
  userId: string
  role: string
  disabled?: boolean
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Select
      value={role}
      onValueChange={(v) =>
        startTransition(async () => void (await changeUserRole(userId, v as never)))
      }
    >
      <SelectTrigger size="sm" className="h-7 w-auto text-xs" disabled={disabled || pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
