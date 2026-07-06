'use client'

import { useState, useTransition } from 'react'
import { saveChannelSpend } from '@/server/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SpendForm() {
  const [channel, setChannel] = useState('')
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        className="h-8 w-32"
        placeholder="canal (google…)"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
      />
      <Input
        className="text-data h-8 w-36"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />
      <Input
        className="text-data h-8 w-28"
        placeholder="CHF"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
      />
      <Button
        size="xs"
        disabled={pending || !channel || !month || !amount}
        onClick={() =>
          startTransition(async () => {
            const res = await saveChannelSpend({ channel, month, amount: Number(amount) })
            if (res.ok) {
              setDone(true)
              setTimeout(() => setDone(false), 2500)
            }
          })
        }
      >
        Enregistrer
      </Button>
      {done ? <span className="text-pilot-700 text-xs">OK</span> : null}
    </div>
  )
}
