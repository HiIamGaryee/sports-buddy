import type { SafetyReport } from '@/types/safety'
export interface ReportRepository { submitReport(report: Omit<SafetyReport, 'id' | 'createdAt' | 'status'>): Promise<SafetyReport> }
export const REPORTS_COLLECTION = 'reports'
