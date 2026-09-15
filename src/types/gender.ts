export type Gender = 'male' | 'female'

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const satisfies readonly { value: Gender; label: string }[]

const GENDER_VALUES = new Set<Gender>(GENDER_OPTIONS.map(({ value }) => value))

export const isGender = (value: unknown): value is Gender =>
  typeof value === 'string' && GENDER_VALUES.has(value as Gender)

export const formatGender = (gender: Gender | null | undefined) =>
  GENDER_OPTIONS.find(({ value }) => value === gender)?.label ?? ''
