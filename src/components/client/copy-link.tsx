'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CopyLink({ url }: { url: string }) {
  const t = useTranslations('clientApp.referral')
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        className="text-data text-sm"
        onFocus={(e) => e.target.select()}
      />
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {copied ? t('copied') : t('copy')}
      </Button>
    </div>
  )
}
