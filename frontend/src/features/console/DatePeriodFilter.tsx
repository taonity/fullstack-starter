'use client'

import { useEffect, useId, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'

export interface DatePeriod {
  startDate: string
  endDate: string
}

export function DatePeriodFilter({ value, onChange, disabled = false, loadRange, refreshKey = 0, onError }: {
  value: DatePeriod
  onChange: (period: DatePeriod) => void
  disabled?: boolean
  loadRange?: () => Promise<{ startDate: string | null; endDate: string | null }>
  refreshKey?: number
  onError?: (message: string) => void
}) {
  const id = useId()
  const [editedDraft, setDraft] = useState<DatePeriod | null>(null)
  const [available, setAvailable] = useState<DatePeriod | null>(null)
  const [loading, setLoading] = useState(Boolean(loadRange))
  const filtered = Boolean(value.startDate || value.endDate)
  const applied = filtered ? value : available ?? value
  const draft = editedDraft ?? applied
  const showLoading = disabled || (loading && available === null)

  useEffect(() => {
    if (!loadRange || disabled) return
    let current = true
    setLoading(true)
    loadRange().then((range) => {
      if (current) setAvailable({ startDate: range.startDate ?? '', endDate: range.endDate ?? '' })
    }).catch(() => {
      if (current) onError?.('Failed to load available dates.')
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [disabled, loadRange, onError, refreshKey])
  const invalid = Boolean(draft.startDate && draft.endDate && draft.startDate > draft.endDate)
  const changed = draft.startDate !== applied.startDate || draft.endDate !== applied.endDate

  return (
    <fieldset disabled={disabled} aria-label="Date period" className="console-inset flex min-w-0 flex-wrap items-center gap-2 border-b pb-3">
      <legend className="sr-only">Date period (UTC)</legend>
      <span className="text-xs font-medium text-muted-foreground">Dates (UTC)</span>
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-start`} className="text-xs text-muted-foreground">From</label>
        {showLoading ? <Skeleton className="h-8 w-40" /> : <DatePicker id={`${id}-start`} label="Start date (UTC)" value={draft.startDate} max={draft.endDate || undefined}
          invalid={invalid} describedBy={invalid ? `${id}-error` : undefined} onChange={(startDate) => setDraft({ ...draft, startDate })} />}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-end`} className="text-xs text-muted-foreground">To</label>
        {showLoading ? <Skeleton className="h-8 w-40" /> : <DatePicker id={`${id}-end`} label="End date (UTC)" value={draft.endDate} min={draft.startDate || undefined}
          invalid={invalid} describedBy={invalid ? `${id}-error` : undefined} onChange={(endDate) => setDraft({ ...draft, endDate })} />}
      </div>
      <Button variant="outline" size="icon-sm" aria-label="Apply date period" title="Apply date period" disabled={!changed || invalid || showLoading}
        onClick={() => {
          const fullRange = available && draft.startDate === available.startDate && draft.endDate === available.endDate
          onChange(fullRange ? { startDate: '', endDate: '' } : draft)
          setDraft(null)
        }}><Check /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Clear date period" title="Clear date period" disabled={(!changed && !filtered) || showLoading}
        onClick={() => { setDraft(null); onChange({ startDate: '', endDate: '' }) }}><X /></Button>
      {invalid ? <span id={`${id}-error`} role="alert" className="text-xs text-destructive">Start date must not be after end date.</span>
        : !filtered ? <span className="text-xs text-muted-foreground">All time</span> : null}
    </fieldset>
  )
}
