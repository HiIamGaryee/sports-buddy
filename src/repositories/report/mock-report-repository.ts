import { readStoreArray, writeStore } from '@/repositories/mock-store'
import type { ReportRepository } from '@/repositories/report/report-repository'
import type { SafetyReport } from '@/types/safety'
const key = 'sports-buddy.mock-reports'
const isReport = (value: unknown): value is SafetyReport => typeof value === 'object' && value !== null && typeof (value as SafetyReport).id === 'string'
export const mockReportRepository: ReportRepository = { async submitReport(report) { const saved: SafetyReport = { ...report, id: `report_${crypto.randomUUID()}`, status: 'submitted', createdAt: new Date().toISOString() }; writeStore(key, [...readStoreArray<SafetyReport>(key, isReport), saved]); return saved } }
