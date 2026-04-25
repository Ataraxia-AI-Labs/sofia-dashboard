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
export { fetchPatients, fetchPatientDetail, fetchPatientAliases, fetchPatientMLFeatures, createPatient, updatePatient, exportPatientsCSV, sendWhatsAppMessage } from './patients'
export type { PatientAlias } from './patients'

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
export { generateEmbeddings, runClustering, getSegments, getPatientSegment, findSimilarPatients, getCampaignSuggestion } from './segments'

// Conversion Predictions (P4-05)
export { predictConversion, predictAll, getConversionInsights, getFollowUpQueue, getBestContactTime } from './conversions'

// Dynamic Pricing (P4-03)
export { getPricingRules, updatePricingRules, suggestPrice, suggestPriceBatch, getPriceSuggestions, applyPriceSuggestion, rejectPriceSuggestion, getPricingInsights } from './pricing'

// Network Intelligence (P4-07)
export { getNetworkBenchmarks, getServiceTrends, getPricingBenchmark, getConversionPatterns, getOptimalHours, getNetworkAlerts, getNetworkNarrative, getNetworkStats, publishMetrics } from './network'

// Audit Logs
export { fetchAuditLogs } from './audit'
export type { AuditLogEntry, AuditLogResponse } from './audit'

// Webhooks (P6-C)
export { listWebhookEndpoints, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint, testWebhookEndpoint, listWebhookDeliveries, retryWebhookDelivery, getWebhookEventCatalog } from './webhooks'
export type { WebhookEndpoint, WebhookDelivery } from './webhooks'

// Workflows (P6-A)
export { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, activateWorkflow, pauseWorkflow, archiveWorkflow, listTemplates, createFromTemplate, enrollPatients, listEnrollments, getWorkflowAnalytics, getWorkflowComparison } from './workflows'
export type { Workflow, WorkflowStep, WorkflowTemplate, WorkflowEnrollment } from './workflows'

// Growth (P6-E)
export { getAttribution, getChannelROI, getPatientJourney, getGrowthDashboard, listAdCampaigns, getAdCampaignROI, generateAdContent, generateKeywords, getSEOHealth } from './growth'
export type { AttributionData, GrowthMetrics, AdCampaign } from './growth'

// Conversational Intelligence (P6-D)
export { getPatientMemories, addPatientMemory, deletePatientMemory, searchPatientMemories, getPatientPersonality, getPatientEmotions, getEmotionTrajectory, getEmotionAnalytics, getPatientIntents, getIntentAnalytics, getPatientSummary, generatePatientSummary, getCoachingPatterns, getCoachingTips, markTipRead, getStaffMetrics, getCoachingDashboard, getProactiveQueue, getProactiveAnalytics } from './conv-intel'
export type { PatientMemory, PersonalityProfile, EmotionProfile, EmotionTrajectory, CoachingTip, StaffMetric } from './conv-intel'

// Content AI Studio (P6-E)
export { listContent, createContent, updateContent, getContentAnalytics, suggestTopics, getContentCalendar } from './content'
export type { ContentItem } from './content'

// Referrals (P6-E)
export { getReferralProgram, updateReferralProgram, generateReferralLink, getReferralLeaderboard, getReferralAnalytics } from './referrals'
export type { ReferralProgram, ReferralLeaderEntry, ReferralAnalytics } from './referrals'

// Reviews / GMB
export { listReviews, getReviewStats, replyToReview, generateReviewReply, syncReviews, getReputationDashboard, getNPS, requestReview } from './reviews'
export type { Review, ReviewStats } from './reviews'

// Marketplace & Plugins (P6-C)
export { browseConnectors, getConnectorDetail, getCategories, installConnector, uninstallConnector, listInstalled, getConnectorReviews, listPlugins, createPlugin, updatePlugin, deletePlugin, testPlugin } from './marketplace'
export type { Connector, InstalledConnector, Plugin } from './marketplace'

// API Keys
export { listApiKeys, createApiKey, revokeApiKey } from './api-keys'
export type { ApiKey } from './api-keys'

