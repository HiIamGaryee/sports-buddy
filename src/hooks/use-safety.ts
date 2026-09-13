import { useContext } from 'react'
import { SafetyContext } from '@/providers/safety-context'
export function useSafety() { const context = useContext(SafetyContext); if (!context) throw new Error('useSafety must be used inside SafetyProvider'); return context }
