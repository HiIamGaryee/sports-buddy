import { useState } from 'react'

import { SelectableCard } from '@/components/profile/selectable-card'
import { Input } from '@/components/ui/input'
import { AREAS } from '@/constants/areas'
import type { AreaId } from '@/types/sports-profile'

/** Approximate areas only — no map, no coordinates, no GPS. */
export function AreaSelector({
  value,
  onChange,
  inputId = 'area-search',
}: {
  value: AreaId | null
  onChange: (area: AreaId) => void
  inputId?: string
}) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()
  const areas = search
    ? AREAS.filter((area) => area.name.toLowerCase().includes(search))
    : AREAS

  return (
    <div className="flex flex-col gap-3">
      <Input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search areas"
        autoComplete="off"
        aria-label="Search areas"
      />
      <div className="flex flex-col gap-2">
        {areas.map(({ id, name }) => (
          <SelectableCard
            key={id}
            title={name}
            selected={value === id}
            onClick={() => onChange(id)}
          />
        ))}
        {areas.length === 0 && (
          <p className="text-body-small text-muted-foreground">
            No area matches “{query}”. More areas are coming soon.
          </p>
        )}
      </div>
    </div>
  )
}
