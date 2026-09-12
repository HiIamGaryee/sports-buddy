import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { REPORTS_COLLECTION, type ReportRepository } from '@/repositories/report/report-repository'
import { getFirebaseDb } from '@/services/firebase/client'
export const firebaseReportRepository: ReportRepository = { async submitReport(report) { const ref = await addDoc(collection(getFirebaseDb(), REPORTS_COLLECTION), { reporterId: report.reporterId, reportedUserId: report.reportedUserId, reason: report.reason, note: report.note, context: report.context, status: 'submitted', createdAt: serverTimestamp() }); return { ...report, id: ref.id, status: 'submitted', createdAt: new Date().toISOString() } } }
