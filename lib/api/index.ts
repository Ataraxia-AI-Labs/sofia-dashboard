/**
 * API Module — Barrel re-exports
 * ================================
 * All domain modules re-exported from a single entry point.
 * Existing imports like `from '@/lib/api'` continue to work unchanged.
 *
 * For new code, prefer importing from specific domain modules:
 *   import { fetchPatients } from '@/lib/api/patients'
 *   import { formatCOP } from '@/lib/api/helpers'
 */

// Helpers & formatters
export { withBranch, formatCurrency, formatCOP, formatUSD, formatNumber, formatPercent, timeAgo } from './helpers'

// Branches
export { fetchBranches } from './branches'

// Analytics
export { fetchFullAnalytics, fetchQuickMetrics, fetchAiQualityMetrics, downloadReportPdf } from './analytics'

// Patients
export { fetchPatients, fetchPatientDetail, fetchPatientMLFeatures, createPatient, updatePatient, exportPatientsCSV, sendWhatsAppMessage } from './patients'

// Appointments
export {
  fetchAppointments, fetchPatientAppointments, updateAppointmentStatus, createAppointment,
  rescheduleAppointment, assignStaff, fetchStaffList, fetchAppointmentSeries,
  createAppointmentSeries, updateAppointmentSeries,
} from './appointments'

// Opportunities
export { fetchOpportunities, updateOpportunity } from './opportunities'

// Organization
export { fetchOrganization, fetchUserOrganization, updateOrganization, generateSystemPrompt, uploadOrgLogo, deleteOrgLogo, validateCustomDomain, updateBrandColors } from './organization'

// Services catalog
export { fetchServicesCatalog, createService, updateService, deleteService } from './services'

// Business hours
export { fetchBusinessHours, updateBusinessHour } from './business-hours'

// Treatments
export { fetchActiveTreatments, fetchPatientTreatments, createTreatment, updateTreatmentStatus } from './treatments'

// Interactions
export { fetchInteractions, annotateInteraction, removeAnnotation, fetchAnnotationStats } from './interactions'
export type { InteractionLog } from '@/types'

// Data lake
export { fetchDataLakeStats, fetchDataLakeDaily, fetchTrainingReadyCount, exportDataLakeJSONL } from './data-lake'

// Voice
export { fetchVoiceMetrics } from './voice'

// Pipeline
export { fetchPipelineData } from './pipeline'

// Staff notes
export { fetchStaffNotes, createStaffNote } from './staff-notes'

// Media
export { fetchPatientMedia } from './media'

// Payments
export { fetchPayments, fetchRevenueAttribution } from './payments'

// Health
export { fetchSystemHealth } from './health'

// Team management
export { fetchTeamMembers, inviteTeamMember, updateMemberRole, deactivateMember } from './team'
export type { TeamMember } from './team'

// Takeover
export { fetchActiveTakeovers, startTakeover, endTakeover, sendTakeoverMessage } from './takeover'
export type { ActiveTakeover } from './takeover'

// Channels
export { fetchChannelStatus, connectWhatsApp } from './channels'

// Subscriptions
export { fetchSubscription, createSubscription, changePlan, cancelSubscription, updatePaymentMethod, fetchInvoices, fetchUsage, fetchWompiConfig } from './subscriptions'

// Annotations (P4-06)
export { createAnnotation as createAnnotationExtended, getAnnotations, getAnnotationStats as getAnnotationStatsExtended, deleteAnnotation as deleteAnnotationExtended } from './annotations'
export type { AnnotationRecord, AnnotationStats as AnnotationStatsExtended, AnnotationFilters } from './annotations'

// Prompt Optimizer (P4-08)
export { triggerPromptAnalysis, getPromptSuggestions, updatePromptSuggestion } from './prompt-optimizer'
export type { PromptSuggestion, SuggestionStatus, AnalysisResult } from './prompt-optimizer'

// Fine-tuning Models (P4-01)
export { getModels, deployModel, evaluateModel, getEvaluations, compareModels, getTrainingReadyCount as getModelTrainingReadyCount } from './models'

// Lead Scoring (P4-02)
export { scorePatient, scoreAllLeads, getLeadScores, getLeadInsights, getTopLeads } from './leads'

// Segmentation (P4-04)
export { generateEmbeddings, runClustering, getSegments, getPatientSegment, getSegmentPatients, findSimilarPatients, getCampaignSuggestion } from './segments'

// Conversion Predictions (P4-05)
export { predictConversion, predictAll, getConversionInsights, getFollowUpQueue, getBestContactTime } from './conversions'

// Dynamic Pricing (P4-03)
export { getPricingRules, updatePricingRules, suggestPrice, suggestPriceBatch, getPriceSuggestions, applyPriceSuggestion, rejectPriceSuggestion, getPricingInsights } from './pricing'

// Network Intelligence (P4-07)
export { getNetworkBenchmarks, getServiceTrends, getPricingBenchmark, getConversionPatterns, getOptimalHours, getNetworkAlerts, getNetworkNarrative, getNetworkStats, publishMetrics } from './network'
