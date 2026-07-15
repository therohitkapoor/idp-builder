import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { readLocalJson, saveLocalUploadedDocument, writeLocalJson } from "./localPersistence";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import {
  getDb,
  getAllUsers,
  updateUserRole,
  getUserIdpStats,
  insertRoleAuditLog,
  getRoleAuditLog,
  deleteIdpById,
  deleteIdpsByIds,
  getAdminConfiguration,
  loginWithCredentials,
  saveAdminConfiguration,
} from "./db";
import { sdk } from "./_core/sdk";
import { idpRecords, users } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createDefaultManagerReview,
  createEmptyEnterpriseContextInputs,
  developmentFrameworks,
  idpModes,
  objectiveProgressStatuses,
  supportingSourceTypes,
  type DevelopmentFramework,
  type EnterpriseContextInputs,
  type EnterpriseIdpContext,
  type ExtractedInsight,
  type ExtractedInsightCategory,
  type IdpMode,
  type ManagerReview,
  type PriorityCheckIn,
  type SupportingSourceType,
  type UploadedSourceFile,
} from "@shared/idpEnterprise";
import {
  normalizeAdminConfiguration,
  type AdminCompanyDocument,
  type AdminConfiguration,
} from "@shared/adminConfig";

// Schema for uploaded file
const uploadedFileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  url: z.string().optional(),
  key: z.string(),
  sourceType: z.enum(supportingSourceTypes).optional().default("other"),
  mimeType: z.string().optional().default("application/octet-stream"),
  size: z.number().optional().default(0),
  hash: z.string().optional().default(""),
  status: z.enum(["uploaded", "ready", "failed"]).optional().default("ready"),
  progress: z.number().optional().default(100),
  uploadedAt: z.string().optional(),
  extractedText: z.string().optional().default(""),
  extractedSummary: z.string().optional().default(""),
});

const idpModeSchema = z.enum(idpModes);
const supportingSourceSchema = z.enum(supportingSourceTypes);
const developmentFrameworkSchema = z.enum(developmentFrameworks);

const sourceFileSchema: z.ZodType<UploadedSourceFile> = uploadedFileSchema.transform((file) => ({
  id: file.id || nanoid(),
  name: file.name,
  url: file.url,
  key: file.key,
  sourceType: file.sourceType,
  mimeType: file.mimeType,
  size: file.size,
  hash: file.hash,
  status: file.status,
  progress: file.progress,
  uploadedAt: file.uploadedAt || new Date().toISOString(),
  extractedText: file.extractedText,
  extractedSummary: file.extractedSummary,
}));

const adminManagedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().optional(),
  key: z.string().optional(),
  hash: z.string().optional(),
  mimeType: z.string(),
  size: z.number().min(0),
  uploadedAt: z.string(),
  status: z.enum(["ready", "pending_review", "removed"]),
});

const adminCompanyDocumentSchema = adminManagedFileSchema.extend({
  organizationId: z.string().min(1),
  category: z.enum([
    "strategy_business_priorities",
    "leadership_competency_framework",
    "culture_values",
    "organization_structure",
    "role_job_description",
    "role_career_architecture",
    "success_profile",
    "digital_ai_sustainability",
    "policy_other",
  ]),
  sourceType: supportingSourceSchema,
  sourceClassification: z.enum([
    "internal_official",
    "official_public",
    "industry_benchmark",
    "role_source",
  ]),
  reviewStatus: z.enum(["needs_review", "approved", "superseded", "expired"]),
  confidentiality: z.enum(["public", "internal", "confidential", "restricted"]),
  businessUnit: z.string(),
  geography: z.string(),
  roleFamily: z.string(),
  leadershipLevel: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string(),
    owner: z.string(),
    version: z.string(),
    extractedText: z.string().optional().default(""),
    extractedSummary: z.string(),
    adminNotes: z.string(),
});

const adminProgramDocumentSchema = adminManagedFileSchema.extend({
  documentType: z.enum(["program_brochure", "ppt_deck", "objectives_document", "other"]),
  reviewStatus: z.enum(["needs_review", "verified"]),
  extractedText: z.string().optional().default(""),
  extractedSummary: z.string(),
  extractedFields: z.object({
    programName: z.string().optional(),
    objectives: z.string().optional(),
    moduleThemes: z.string().optional(),
    competencies: z.string().optional(),
  }),
});

const adminOrganizationSchema = z.object({
  id: z.string().min(1),
  organizationName: z.string().min(1),
  logoUrl: z.string().optional().default(""),
  primaryColor: z.string().optional().default("#047857"),
  secondaryColor: z.string().optional().default("#0f172a"),
  defaultLanguage: z.string().optional().default("en"),
  region: z.string().optional().default("Global"),
  dataRetentionNotes: z.string().optional().default(""),
  idpPublishing: z.object({
    enabled: z.boolean(),
    mode: z.enum(["manual_finalize", "publish_on_generation", "manager_review_then_publish"]),
    lockPublishedIdp: z.boolean(),
  }).optional().default({
    enabled: false,
    mode: "manual_finalize",
    lockPublishedIdp: false,
  }),
});

const adminConfigurationSchema: z.ZodType<AdminConfiguration> = z.object({
  organization: adminOrganizationSchema,
  organizations: z.array(adminOrganizationSchema).min(1),
  selectedOrganizationId: z.string().min(1),
  participants: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    name: z.string(),
    email: z.string(),
    generatedPassword: z.string().optional().default(""),
    role: z.string(),
    department: z.string(),
    managerName: z.string(),
    status: z.enum(["invited", "active", "inactive"]),
    addedAt: z.string(),
  })),
  program: z.object({
    programName: z.string(),
    objectives: z.string(),
    moduleThemes: z.string(),
    competencies: z.string(),
    documents: z.array(adminProgramDocumentSchema),
    prefillSourceDocumentId: z.string(),
    verificationNotes: z.string(),
    lastPrefilledAt: z.string(),
  }),
  companyKnowledge: z.object({
    documents: z.array(adminCompanyDocumentSchema),
    useApprovedDocumentsOnly: z.boolean(),
    requireSourceReferences: z.boolean(),
    flagEvidenceConflicts: z.boolean(),
  }),
  idp: z.object({
    allowedApproaches: z.array(z.enum(["assessment_based", "program_based", "role_based"])).min(1),
    enabledEvidenceSections: z.array(supportingSourceSchema),
    requiredFields: z.array(z.string()),
    leadershipAreas: z.object({
      leadingSelf: z.boolean(),
      leadingTeam: z.boolean(),
      leadingBusiness: z.boolean(),
    }),
    defaultPriorityCount: z.number().min(1).max(5),
    reviewPeriod: z.string(),
    managerReviewRequired: z.boolean(),
  }),
  evidence: z.object({
    allowedFileTypes: z.array(z.string()).min(1),
    maxFileSizeMb: z.number().min(1).max(100),
    framework702010Mode: z.enum(["hidden", "optional", "enabled"]),
    developmentFramework: developmentFrameworkSchema,
    requiredEvidenceByProgram: z.array(supportingSourceSchema),
    assessmentProviders: z.array(z.string()),
    competencyFrameworkFiles: z.array(adminManagedFileSchema),
    secureDeletionEnabled: z.boolean(),
    evidenceReviewStatus: z.enum(["not_configured", "draft", "review_required", "ready"]),
  }),
  report: z.object({
    template: z.enum(["standard", "executive", "manager_review", "custom"]),
    targetPageCount: z.string(),
    maxPriorityCount: z.number().min(1).max(5),
    sectionOrder: z.array(z.string()),
    enabledSections: z.object({
      purposeGuidance: z.boolean(),
      executiveSummary: z.boolean(),
      employeeInformation: z.boolean(),
      leadershipContext: z.boolean(),
      growThinkExecuteInspireAssessment: z.boolean(),
      evidenceSummary: z.boolean(),
      strengthsAndGaps: z.boolean(),
      goalSettingCanvas: z.boolean(),
      developmentPriorities: z.boolean(),
      actionPlan: z.boolean(),
      hitachiChallenge: z.boolean(),
      masterclassReflectionJournal: z.boolean(),
      midpointPeerFeedback: z.boolean(),
      evidenceImpactTracker: z.boolean(),
      finalIntegratedReflection: z.boolean(),
      personalLeadershipCommitment: z.boolean(),
      seniorLeaderWitness: z.boolean(),
      continuationPlan: z.boolean(),
      growModel: z.boolean(),
      managerGuide: z.boolean(),
      progressTracking: z.boolean(),
      learningRecommendations: z.boolean(),
      signatures: z.boolean(),
    }),
    showEvidenceConfidence: z.boolean(),
    showAiDisclosure: z.boolean(),
    useOrganizationBranding: z.boolean(),
    printFriendlyView: z.boolean(),
    customInstructions: z.string(),
  }),
  revisions: z.object({
    allowParticipantRevisions: z.boolean(),
    allowManagerSuggestedEdits: z.boolean(),
    requireRevisionReason: z.boolean(),
    requireManagerReapproval: z.boolean(),
    showRevisionHistory: z.boolean(),
    lockFinalizedIdp: z.boolean(),
    revisionCadence: z.enum(["on_demand", "monthly", "quarterly", "program_milestone"]),
    editableSections: z.array(z.string()),
  }),
});

const legacyAdminConfigurationSchema = z.object({
  organization: z.object({
    organizationName: z.string().min(1),
    logoUrl: z.string().optional().default(""),
    primaryColor: z.string().optional().default("#047857"),
    secondaryColor: z.string().optional().default("#0f172a"),
    defaultLanguage: z.string().optional().default("en"),
    region: z.string().optional().default("Global"),
    dataRetentionNotes: z.string().optional().default(""),
  }),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    department: z.string(),
    managerName: z.string(),
    status: z.enum(["invited", "active", "inactive"]),
    addedAt: z.string(),
  })),
  program: z.object({
    programName: z.string(),
    objectives: z.string(),
    moduleThemes: z.string(),
    competencies: z.string(),
  }),
  idp: z.object({
    allowedApproaches: z.array(z.enum(["assessment_based", "program_based", "role_based"])).min(1),
    enabledEvidenceSections: z.array(supportingSourceSchema),
    requiredFields: z.array(z.string()),
    leadershipAreas: z.object({
      leadingSelf: z.boolean(),
      leadingTeam: z.boolean(),
      leadingBusiness: z.boolean(),
    }),
    defaultPriorityCount: z.number().min(1).max(5),
    reviewPeriod: z.string(),
    managerReviewRequired: z.boolean(),
  }),
  evidence: z.object({
    allowedFileTypes: z.array(z.string()).min(1),
    maxFileSizeMb: z.number().min(1).max(100),
    framework702010Mode: z.enum(["hidden", "optional", "enabled"]),
    developmentFramework: developmentFrameworkSchema,
    requiredEvidenceByProgram: z.array(supportingSourceSchema),
    assessmentProviders: z.array(z.string()),
    competencyFrameworkFiles: z.array(adminManagedFileSchema),
    secureDeletionEnabled: z.boolean(),
    evidenceReviewStatus: z.enum(["not_configured", "draft", "review_required", "ready"]),
  }),
}).passthrough();

const assessmentInputSchema = z.object({
  id: z.string(),
  assessmentType: z.string().optional().default(""),
  provider: z.string().optional().default(""),
  assessmentDate: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  files: z.array(sourceFileSchema).optional().default([]),
});

const contextInputsSchema: z.ZodType<EnterpriseContextInputs> = z.object({
  assessments: z.array(assessmentInputSchema).optional().default([]),
  program: z.object({
    programName: z.string().optional().default(""),
    objectives: z.string().optional().default(""),
    moduleThemes: z.string().optional().default(""),
    keyCompetencies: z.string().optional().default(""),
    facultyCoachNotes: z.string().optional().default(""),
    learningSummary: z.string().optional().default(""),
    programDocuments: z.array(sourceFileSchema).optional().default([]),
    participantAssignments: z.array(sourceFileSchema).optional().default([]),
  }).optional().default(createEmptyEnterpriseContextInputs().program),
  roleOrganization: z.object({
    jobDescriptionFiles: z.array(sourceFileSchema).optional().default([]),
    roleDescriptionFiles: z.array(sourceFileSchema).optional().default([]),
    competencyFrameworkFiles: z.array(sourceFileSchema).optional().default([]),
    organizationLeadershipFrameworkFiles: z.array(sourceFileSchema).optional().default([]),
    successProfileFiles: z.array(sourceFileSchema).optional().default([]),
    strategicPriorityFiles: z.array(sourceFileSchema).optional().default([]),
    futureRoleExpectations: z.string().optional().default(""),
    successMeasures: z.string().optional().default(""),
  }).optional().default(createEmptyEnterpriseContextInputs().roleOrganization),
  manager: z.object({
    conversationSummary: z.string().optional().default(""),
    conversationFiles: z.array(sourceFileSchema).optional().default([]),
    agreedDevelopmentGoals: z.string().optional().default(""),
    strengthsIdentified: z.string().optional().default(""),
    developmentAreasIdentified: z.string().optional().default(""),
    supportExpected: z.string().optional().default(""),
    reviewCadence: z.string().optional().default(""),
  }).optional().default(createEmptyEnterpriseContextInputs().manager),
  participant: z.object({
    careerAspiration: z.string().optional().default(""),
    developmentPriorities: z.string().optional().default(""),
    currentChallenges: z.string().optional().default(""),
    desiredBusinessImpact: z.string().optional().default(""),
    additionalContext: z.string().optional().default(""),
  }).optional().default(createEmptyEnterpriseContextInputs().participant),
});

const extractedInsightSchema: z.ZodType<ExtractedInsight> = z.object({
  id: z.string(),
  category: z.enum([
    "strength",
    "development_area",
    "assessment_theme",
    "program_theme",
    "role_expectation",
    "competency",
    "business_priority",
    "manager_expectation",
    "participant_aspiration",
    "conflict_or_uncertainty",
  ]),
  text: z.string(),
  sourceType: supportingSourceSchema,
  sourceLabel: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  status: z.enum(["accepted", "edited", "removed", "flagged"]),
  userConfirmed: z.boolean(),
  aiInferred: z.boolean(),
  notes: z.string().optional(),
});

const organizationConfigSchema = z.object({
  organizationName: z.string().optional().default(""),
  organizationLogo: z.string().optional(),
  brandColors: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
  }).optional(),
  competencyFramework: z.string().optional(),
  leadershipFramework: z.string().optional(),
  programObjectives: z.string().optional(),
  roleArchitecture: z.string().optional(),
  successProfiles: z.string().optional(),
  approvedDevelopmentFramework: developmentFrameworkSchema.optional(),
  approvedLearningCatalog: z.string().optional(),
  idpOutputTemplate: z.string().optional(),
  idpReportConfiguration: z.record(z.string(), z.unknown()).optional(),
  revisionConfiguration: z.record(z.string(), z.unknown()).optional(),
});

const checkInSchema = z.object({
  id: z.string(),
  objectiveIndex: z.number(),
  createdAt: z.string(),
  whatTried: z.string(),
  whatHappened: z.string(),
  whatChanged: z.string(),
  whatGotInTheWay: z.string(),
  whatNext: z.string(),
  supportNeeded: z.string(),
});

const localIdpRecords = new Map<number, any>();
let nextLocalIdpId = 1;

type PersistedLocalIdpStore = {
  nextLocalIdpId: number;
  records: any[];
};

const localIdpDateFields = [
  "dateOfJoining",
  "dateOfIdpCreation",
  "employeeSignedAt",
  "managerSignedAt",
  "createdAt",
  "updatedAt",
];

const reviveLocalDate = (value: unknown) => {
  if (value instanceof Date || value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

const reviveLocalIdpRecord = (record: any) => {
  const revived = { ...record };
  for (const field of localIdpDateFields) {
    if (field in revived) {
      revived[field] = reviveLocalDate(revived[field]);
    }
  }
  return revived;
};

const hydrateLocalIdpRecords = () => {
  const persisted = readLocalJson<PersistedLocalIdpStore | null>("local-idps.json", null);
  if (!persisted) return;

  localIdpRecords.clear();
  for (const record of persisted.records || []) {
    if (typeof record?.id !== "number") continue;
    localIdpRecords.set(record.id, reviveLocalIdpRecord(record));
  }

  nextLocalIdpId = Math.max(
    persisted.nextLocalIdpId || 1,
    ...Array.from(localIdpRecords.keys()).map((id) => id + 1),
    1
  );
};

const persistLocalIdpRecords = () => {
  writeLocalJson("local-idps.json", {
    nextLocalIdpId,
    records: Array.from(localIdpRecords.values()),
  } satisfies PersistedLocalIdpStore);
};

const setLocalIdpRecord = (id: number, record: any) => {
  localIdpRecords.set(id, record);
  persistLocalIdpRecords();
};

hydrateLocalIdpRecords();

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const normalizeEmployeeDetails = (details: {
  employeeName: string;
  position?: string | null;
  company: string;
  department?: string | null;
  yearsOfExperience?: number | null;
  dateOfJoining?: Date | null;
  dateOfIdpCreation?: Date | null;
  directManager?: string | null;
}) => {
  const dateOfIdpCreation = isValidDate(details.dateOfIdpCreation)
    ? details.dateOfIdpCreation
    : new Date();

  return {
    employeeName: details.employeeName,
    position: details.position ?? "",
    company: details.company,
    department: details.department ?? "",
    yearsOfExperience:
      typeof details.yearsOfExperience === "number" &&
      Number.isFinite(details.yearsOfExperience)
      ? details.yearsOfExperience
      : 0,
    dateOfJoining: isValidDate(details.dateOfJoining)
      ? details.dateOfJoining
      : dateOfIdpCreation,
    dateOfIdpCreation,
    directManager: details.directManager ?? "",
  };
};

const outputLanguageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  zh: "Mandarin Chinese",
  ar: "Arabic",
  id: "Bahasa Indonesia",
  vi: "Vietnamese",
  th: "Thai",
  es: "Spanish",
  de: "German",
  nl: "Dutch",
};

const getOutputLanguageName = (language: string | undefined) =>
  outputLanguageNames[language || "en"] || "English";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const allowedUploadTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".csv": ["text/csv", "application/csv", "text/plain"],
  ".json": ["application/json", "text/plain"],
  ".xml": ["application/xml", "text/xml", "text/plain"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
};

const sourceLabels: Record<SupportingSourceType, string> = {
  assessment: "Assessment",
  program: "Program",
  job_description: "Job Description",
  role_description: "Role Description",
  competency_framework: "Competency Framework",
  organization_leadership_framework: "Organization Leadership Framework",
  success_profile: "Success Profile",
  strategic_priorities: "Strategic Priorities",
  manager_notes: "Manager Notes",
  participant_goals: "Participant Goals",
  organization_goals: "Organization Goal",
  other: "Supporting Evidence",
};

const sanitizeFileName = (filename: string) => {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned.slice(0, 120) || "upload";
};

const getExtension = (filename: string) => {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || "";
};

const validateUpload = (filename: string, contentType: string, size: number) => {
  const extension = getExtension(filename);
  const allowedTypes = allowedUploadTypes[extension];

  if (!allowedTypes) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unsupported file type. Upload PDF, DOC, DOCX, PPT, PPTX, XLSX, TXT, MD, CSV, JSON, XML, or standard image files.",
    });
  }

  if (size > MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File is too large. Maximum upload size is 15 MB.",
    });
  }

  const normalizedType = (contentType || "application/octet-stream").toLowerCase();
  if (normalizedType !== "application/octet-stream" && !allowedTypes.includes(normalizedType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File type does not match the uploaded document extension.",
    });
  }
};

const MAX_EXTRACTED_TEXT_CHARS = 16_000;

const normalizeExtractedText = (value: string) =>
  value
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_CHARS);

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const xmlToText = (xml: string) =>
  normalizeExtractedText(decodeXmlEntities(xml.replace(/<[^>]+>/g, " ")));

const isUsefulOfficeXmlPath = (path: string, extension: string) => {
  if (extension === ".docx") return /^word\/(document|header\d*|footer\d*)\.xml$/i.test(path);
  if (extension === ".pptx") return /^ppt\/(slides|notesSlides)\/.+\.xml$/i.test(path);
  return false;
};

const findZipDirectoryEnd = (buffer: Buffer) => {
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66_000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
};

const extractTextFromOfficeZip = (buffer: Buffer, extension: string) => {
  const endOffset = findZipDirectoryEnd(buffer);
  if (endOffset < 0 || endOffset + 22 > buffer.length) return "";

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const chunks: string[] = [];

  for (let index = 0; index < entryCount && offset + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (isUsefulOfficeXmlPath(fileName, extension) && localHeaderOffset + 30 <= buffer.length) {
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataStart >= 0 && dataEnd <= buffer.length) {
        try {
          const compressed = buffer.subarray(dataStart, dataEnd);
          const xml =
            method === 0
              ? compressed.toString("utf8")
              : method === 8
                ? inflateRawSync(compressed).toString("utf8")
                : "";
          if (xml) chunks.push(xmlToText(xml));
        } catch {
          // Keep best-effort extraction resilient to a single unreadable entry.
        }
      }
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return normalizeExtractedText(chunks.join("\n"));
};

const extractTextFromPdfBestEffort = (buffer: Buffer) => {
  const content = buffer.toString("latin1");
  const textObjects = [
    ...Array.from(content.matchAll(/\(([^()]{8,500})\)\s*Tj/g)).map((match) => match[1]),
    ...Array.from(content.matchAll(/\[([^\]]{12,1500})\]\s*TJ/g)).map((match) =>
      match[1].replace(/\(([^()]*)\)/g, " $1 ")
    ),
  ];
  return normalizeExtractedText(textObjects.join(" ").replace(/\\[nrtbf()\\]/g, " "));
};

const extractTextFromUpload = (filename: string, contentType: string, buffer: Buffer) => {
  const extension = getExtension(filename);
  try {
    if ([".txt", ".md", ".csv", ".json", ".xml"].includes(extension) || contentType.startsWith("text/")) {
      return normalizeExtractedText(buffer.toString("utf8"));
    }
    if (extension === ".docx" || extension === ".pptx") return extractTextFromOfficeZip(buffer, extension);
    if (extension === ".pdf") return extractTextFromPdfBestEffort(buffer);
  } catch {
    return "";
  }
  return "";
};

const summarizeExtractedText = (text: string, fallbackName: string) => {
  if (!text.trim()) {
    return `Uploaded ${fallbackName}. Text extraction was not available for this file, but the protected file reference was retained.`;
  }
  return text.split(/[.!?]\s+/).slice(0, 4).join(". ").slice(0, 900);
};

const toNormalizedSourceFiles = (
  files: Array<z.input<typeof uploadedFileSchema>> | undefined
): UploadedSourceFile[] =>
  (files || []).map((file) => ({
    id: file.id || nanoid(),
    name: file.name,
    url: file.url,
    key: file.key,
    sourceType: file.sourceType || "other",
    mimeType: file.mimeType || "application/octet-stream",
    size: file.size || 0,
    hash: file.hash || "",
    status: file.status || "ready",
    progress: file.progress || 100,
    uploadedAt: file.uploadedAt || new Date().toISOString(),
    extractedText: file.extractedText || "",
    extractedSummary: file.extractedSummary || "",
  }));

const isCompanyDocumentCurrent = (document: AdminCompanyDocument) => {
  if (!document.expiryDate) return true;
  const expiry = new Date(`${document.expiryDate}T23:59:59`);
  return Number.isNaN(expiry.getTime()) || expiry.getTime() >= Date.now();
};

const toCompanySourceFile = (document: AdminCompanyDocument): UploadedSourceFile => ({
  id: document.id,
  name: document.name,
  url: document.url || undefined,
  key: document.key || `company-knowledge/${document.organizationId}/${document.id}`,
  sourceType: document.sourceType,
  mimeType: document.mimeType,
  size: document.size,
  hash: document.hash || document.id,
  status: "ready",
  progress: 100,
  uploadedAt: document.uploadedAt,
  extractedText: document.extractedText || document.extractedSummary || "",
  extractedSummary: document.extractedSummary || document.adminNotes || "",
});

const createInsight = (
  category: ExtractedInsightCategory,
  text: string,
  sourceType: SupportingSourceType,
  confidence: "low" | "medium" | "high" = "medium",
  aiInferred = false
): ExtractedInsight => ({
  id: nanoid(),
  category,
  text: text.trim(),
  sourceType,
  sourceLabel: sourceLabels[sourceType],
  confidence,
  status: "accepted",
  userConfirmed: false,
  aiInferred,
});

const splitLines = (value: string | undefined, maxItems = 6) =>
  (value || "")
    .split(/\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);

const buildExtractedInsights = ({
  contextInputs,
  sourceFiles,
  aspiration,
}: {
  contextInputs: EnterpriseContextInputs;
  sourceFiles: UploadedSourceFile[];
  aspiration?: string | null;
}) => {
  const insights: ExtractedInsight[] = [];

  contextInputs.assessments.forEach((assessment) => {
    splitLines(assessment.summary).forEach((item) => {
      insights.push(createInsight("assessment_theme", item, "assessment", "medium"));
    });
    if (assessment.assessmentType || assessment.provider) {
      insights.push(
        createInsight(
          "assessment_theme",
          `${assessment.provider || "Assessment"} ${assessment.assessmentType || "report"}${assessment.assessmentDate ? ` dated ${assessment.assessmentDate}` : ""}`,
          "assessment",
          "high"
        )
      );
    }
  });

  splitLines(contextInputs.program.objectives).forEach((item) =>
    insights.push(createInsight("program_theme", item, "program", "high"))
  );
  splitLines(contextInputs.program.moduleThemes).forEach((item) =>
    insights.push(createInsight("program_theme", item, "program", "medium"))
  );
  splitLines(contextInputs.program.keyCompetencies).forEach((item) =>
    insights.push(createInsight("competency", item, "program", "medium"))
  );
  splitLines(contextInputs.program.learningSummary).forEach((item) =>
    insights.push(createInsight("program_theme", item, "program", "medium"))
  );

  splitLines(contextInputs.roleOrganization.futureRoleExpectations).forEach((item) =>
    insights.push(createInsight("role_expectation", item, "role_description", "high"))
  );
  splitLines(contextInputs.roleOrganization.successMeasures).forEach((item) =>
    insights.push(createInsight("business_priority", item, "strategic_priorities", "high"))
  );

  splitLines(contextInputs.manager.agreedDevelopmentGoals).forEach((item) =>
    insights.push(createInsight("development_area", item, "manager_notes", "high"))
  );
  splitLines(contextInputs.manager.strengthsIdentified).forEach((item) =>
    insights.push(createInsight("strength", item, "manager_notes", "high"))
  );
  splitLines(contextInputs.manager.developmentAreasIdentified).forEach((item) =>
    insights.push(createInsight("development_area", item, "manager_notes", "high"))
  );
  splitLines(contextInputs.manager.supportExpected).forEach((item) =>
    insights.push(createInsight("manager_expectation", item, "manager_notes", "medium"))
  );

  splitLines(contextInputs.participant.careerAspiration || aspiration || undefined).forEach((item) =>
    insights.push(createInsight("participant_aspiration", item, "participant_goals", "high"))
  );
  splitLines(contextInputs.participant.developmentPriorities).forEach((item) =>
    insights.push(createInsight("development_area", item, "participant_goals", "medium"))
  );
  splitLines(contextInputs.participant.currentChallenges).forEach((item) =>
    insights.push(createInsight("development_area", item, "participant_goals", "medium", true))
  );
  splitLines(contextInputs.participant.desiredBusinessImpact).forEach((item) =>
    insights.push(createInsight("business_priority", item, "participant_goals", "medium"))
  );

  sourceFiles.forEach((file) => {
    const category: ExtractedInsightCategory =
      file.sourceType === "assessment"
        ? "assessment_theme"
        : file.sourceType === "program"
          ? "program_theme"
          : file.sourceType === "manager_notes"
            ? "manager_expectation"
            : file.sourceType === "competency_framework" ||
                file.sourceType === "organization_leadership_framework"
              ? "competency"
              : file.sourceType === "strategic_priorities" || file.sourceType === "organization_goals"
                ? "business_priority"
                : "role_expectation";

    splitLines(file.extractedText || file.extractedSummary, 5).forEach((item) => {
      insights.push(createInsight(category, `${file.name}: ${item}`, file.sourceType, "medium", false));
    });

    insights.push(
      createInsight(
        category,
        file.extractedSummary
          ? `${file.name}: ${file.extractedSummary}`
          : `Uploaded ${sourceLabels[file.sourceType].toLowerCase()}: ${file.name}`,
        file.sourceType,
        file.extractedSummary ? "medium" : "low",
        false
      )
    );
  });

  const deduped = new Map<string, ExtractedInsight>();
  insights.forEach((insight) => {
    const key = `${insight.category}:${insight.sourceType}:${insight.text.toLowerCase()}`;
    if (!deduped.has(key) && insight.text.length > 0) {
      deduped.set(key, insight);
    }
  });

  if (deduped.size === 0) {
    deduped.set(
      "conflict_or_uncertainty:other:no-specific-evidence",
      createInsight(
        "conflict_or_uncertainty",
        "No specific source evidence was entered yet. The participant should add role, program, assessment, manager, or aspiration context before finalizing the plan.",
        "other",
        "low",
        true
      )
    );
  }

  return Array.from(deduped.values()).slice(0, 24);
};

const buildEnterpriseContext = ({
  employeeDetails,
  idpMode,
  supportingSources,
  developmentFramework,
  sourceFiles,
  contextInputs,
  confirmedInsights,
  organizationConfig,
  aspiration,
  reviewPeriod,
}: {
  employeeDetails: ReturnType<typeof normalizeEmployeeDetails>;
  idpMode: IdpMode;
  supportingSources: SupportingSourceType[];
  developmentFramework: DevelopmentFramework;
  sourceFiles: UploadedSourceFile[];
  contextInputs: EnterpriseContextInputs;
  confirmedInsights: ExtractedInsight[];
  organizationConfig?: z.infer<typeof organizationConfigSchema>;
  aspiration?: string | null;
  reviewPeriod?: string | null;
}): EnterpriseIdpContext => ({
  participantProfile: {
    employeeName: employeeDetails.employeeName,
    position: employeeDetails.position,
    company: employeeDetails.company,
    department: employeeDetails.department,
    yearsOfExperience: employeeDetails.yearsOfExperience,
    directManager: employeeDetails.directManager,
    aspiration: aspiration || contextInputs.participant.careerAspiration || null,
    reviewPeriod: reviewPeriod || null,
  },
  selectedMode: idpMode,
  supportingSources,
  developmentFramework,
  uploadedEvidence: sourceFiles,
  contextInputs,
  confirmedInsights: confirmedInsights.filter((item) => item.status !== "removed"),
  organizationContext: {
    organizationName: organizationConfig?.organizationName || employeeDetails.company,
    organizationLogo: organizationConfig?.organizationLogo,
    brandColors: organizationConfig?.brandColors,
    competencyFramework: organizationConfig?.competencyFramework,
    leadershipFramework: organizationConfig?.leadershipFramework,
    programObjectives: organizationConfig?.programObjectives || contextInputs.program.objectives,
    roleArchitecture: organizationConfig?.roleArchitecture,
    successProfiles: organizationConfig?.successProfiles,
    approvedDevelopmentFramework: organizationConfig?.approvedDevelopmentFramework || developmentFramework,
    approvedLearningCatalog: organizationConfig?.approvedLearningCatalog,
    idpOutputTemplate: organizationConfig?.idpOutputTemplate,
    idpReportConfiguration: organizationConfig?.idpReportConfiguration,
    revisionConfiguration: organizationConfig?.revisionConfiguration,
  },
});

const buildSourceEvidence = (confirmedInsights: ExtractedInsight[]) =>
  confirmedInsights
    .filter((insight) => insight.status === "accepted" || insight.status === "edited")
    .slice(0, 4)
    .map((insight) => ({
      sourceType: insight.sourceType,
      sourceReference: insight.text,
      confidence: insight.confidence,
      userConfirmed: insight.userConfirmed,
      aiInferred: insight.aiInferred,
    }));

const getConfiguredPriorityCount = (
  organizationConfig?: z.infer<typeof organizationConfigSchema>,
  adminConfig?: AdminConfiguration
) => {
  const rawPriorityCount = (organizationConfig?.idpReportConfiguration as { maxPriorityCount?: unknown } | undefined)
    ?.maxPriorityCount ?? adminConfig?.report.maxPriorityCount ?? adminConfig?.idp.defaultPriorityCount;
  const numericPriorityCount =
    typeof rawPriorityCount === "number" ? rawPriorityCount : Number(rawPriorityCount);

  if (!Number.isFinite(numericPriorityCount)) return 3;
  return Math.min(5, Math.max(1, Math.round(numericPriorityCount)));
};

const getAdminDrivenDevelopmentFramework = (
  adminConfig: AdminConfiguration,
  requestedFramework: DevelopmentFramework,
  includeMethodology702010?: boolean
): DevelopmentFramework => {
  if (adminConfig.evidence.framework702010Mode === "enabled") return "70_20_10";
  if (adminConfig.evidence.framework702010Mode === "hidden") {
    return adminConfig.evidence.developmentFramework === "70_20_10"
      ? "experience_people_learning"
      : adminConfig.evidence.developmentFramework;
  }

  if (includeMethodology702010) return "70_20_10";
  return adminConfig.evidence.developmentFramework || requestedFramework || "experience_people_learning";
};

const getReviewPeriodDays = (reviewPeriod?: string | null) => {
  const value = (reviewPeriod || "").trim().toLowerCase();
  const numberMatch = value.match(/(\d+)/);
  const amount = numberMatch ? Number(numberMatch[1]) : 0;

  if (amount > 0 && value.includes("month")) return amount * 30;
  if (amount > 0 && value.includes("year")) return amount * 365;
  if (amount > 0 && value.includes("week")) return amount * 7;
  if (amount > 0 && value.includes("day")) return amount;
  if (value.includes("quarter")) return 90;

  return 90;
};

type IdpRecordStatus = "draft" | "processing" | "completed" | "in_review" | "finalized" | "archived";

const resolveGeneratedIdpPublicationState = ({
  organization,
  adminConfig,
  managerName,
}: {
  organization: AdminConfiguration["organization"];
  adminConfig: AdminConfiguration;
  managerName?: string | null;
}) => {
  const publishing = organization.idpPublishing || {
    enabled: false,
    mode: "manual_finalize" as const,
    lockPublishedIdp: false,
  };
  const now = new Date().toISOString();
  const managerReview = createDefaultManagerReview(managerName || "");
  let status: IdpRecordStatus = "completed";
  let publicationStatus: "editable" | "published" | "manager_review_required" = "editable";

  if (publishing.enabled && publishing.mode === "publish_on_generation") {
    status = "finalized";
    publicationStatus = "published";
  }

  if (publishing.enabled && publishing.mode === "manager_review_then_publish") {
    status = "in_review";
    publicationStatus = "manager_review_required";
    managerReview.status = "submitted";
    managerReview.submittedAt = now;
    managerReview.managerName = managerReview.managerName || managerName || "";
  }

  return {
    status,
    managerReview,
    metadata: {
      enabled: publishing.enabled,
      mode: publishing.mode,
      appliedStatus: publicationStatus,
      organizationId: organization.id,
      organizationName: organization.organizationName,
      generatedAt: now,
      publishedAt: status === "finalized" ? now : null,
      submittedForManagerReviewAt: status === "in_review" ? now : null,
      lockPublishedIdp: Boolean(publishing.lockPublishedIdp || adminConfig.revisions.lockFinalizedIdp),
    },
  };
};

const summarizeDocumentText = (text?: string, maxLength = 1400) =>
  (text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const joinConfiguredText = (items: Array<string | undefined>, separator = "\n\n") =>
  items.map((item) => item?.trim()).filter(Boolean).join(separator);

const buildCompanyKnowledgeSummary = (documents: AdminCompanyDocument[]) =>
  documents.map((document) => ({
    id: document.id,
    name: document.name,
    category: document.category,
    sourceType: document.sourceType,
    reviewStatus: document.reviewStatus,
    confidentiality: document.confidentiality,
    owner: document.owner,
    version: document.version,
    summary: summarizeDocumentText(document.extractedSummary || document.adminNotes || document.extractedText, 900),
  }));

const buildProgramDocumentSummary = (adminConfig: AdminConfiguration) =>
  adminConfig.program.documents.map((document) => ({
    id: document.id,
    name: document.name,
    documentType: document.documentType,
    reviewStatus: document.reviewStatus,
    extractedFields: document.extractedFields,
    summary: summarizeDocumentText(document.extractedSummary || document.extractedText, 1000),
  }));

const resolveAdminOrganization = ({
  adminConfig,
  organizationConfig,
  employeeCompany,
  userOrganizationId,
}: {
  adminConfig: AdminConfiguration;
  organizationConfig?: z.infer<typeof organizationConfigSchema>;
  employeeCompany: string;
  userOrganizationId?: string | null;
}) => {
  const normalizedCompany = employeeCompany.trim().toLowerCase();
  const normalizedConfigName = (organizationConfig?.organizationName || "").trim().toLowerCase();

  return (
    (userOrganizationId
      ? adminConfig.organizations.find((organization) => organization.id === userOrganizationId)
      : null) ||
    (normalizedConfigName
      ? adminConfig.organizations.find(
          (organization) => organization.organizationName.trim().toLowerCase() === normalizedConfigName
        )
      : null) ||
    adminConfig.organizations.find(
      (organization) => organization.organizationName.trim().toLowerCase() === normalizedCompany
    ) ||
    adminConfig.organizations.find((organization) => organization.id === adminConfig.selectedOrganizationId) ||
    adminConfig.organization
  );
};

const getApprovedCompanyDocuments = (adminConfig: AdminConfiguration, organizationId: string) =>
  adminConfig.companyKnowledge.documents.filter(
    (document) =>
      document.organizationId === organizationId &&
      isCompanyDocumentCurrent(document) &&
      (document.reviewStatus === "approved" ||
        (!adminConfig.companyKnowledge.useApprovedDocumentsOnly && document.reviewStatus === "needs_review"))
  );

const getEnabledParticipantSourceFiles = (files: UploadedSourceFile[], adminConfig: AdminConfiguration) => {
  const enabledSourceTypes = new Set<SupportingSourceType>([
    ...adminConfig.idp.enabledEvidenceSections,
    "manager_notes",
    "participant_goals",
  ]);
  return files.filter((file) => enabledSourceTypes.has(file.sourceType));
};

const getLeadershipDimensionLabels = (
  leadershipAreas: AdminConfiguration["idp"]["leadershipAreas"],
  isArabic: boolean
) =>
  [
    { enabled: true, label: isArabic ? "قيادة الذات" : "Leading Self" },
    { enabled: leadershipAreas.leadingTeam, label: isArabic ? "قيادة الفريق" : "Leading Team" },
    { enabled: leadershipAreas.leadingBusiness, label: isArabic ? "قيادة الأعمال" : "Leading Business" },
  ]
    .filter((item) => item.enabled)
    .map((item) => item.label);

const buildDevelopmentFrameworkInstruction = (framework: DevelopmentFramework) => {
  switch (framework) {
    case "70_20_10":
      return "Use the organization's configured 70-20-10 framework. Label action groups as Experiential, Social, and Formal. Do not force percentages unless provided by the organization.";
    case "grow":
      return "Use the GROW coaching framework as the organizing lens. Connect development actions to Goal, Reality, Options, and Will while keeping the report concise and manager-ready.";
    case "flexible":
      return "Use flexible development actions. Avoid presenting any fixed methodology or percentages.";
    case "custom":
      return "Use the organization's custom development framework if supplied in the context. If not supplied, use plain action groups.";
    case "experience_people_learning":
    default:
      return "Use Experience, People, and Learning as action categories. Do not mention 70-20-10 or percentages.";
  }
};

const cleanEvidenceText = (text: string) =>
  text
    .replace(/^[^:]{1,90}:\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const createEvidenceGroundedObjectiveTitle = (
  insight: ExtractedInsight,
  isArabic: boolean,
  fallbackTitle?: string
) => {
  const text = insight.text;
  const normalized = cleanEvidenceText(text).toLowerCase();

  if (!isArabic) {
    if (/\bdata|dashboard|executive update|executive reporting\b/.test(normalized)) {
      return "Turn data into concise executive updates";
    }
    if (/\bstakeholder|influence|communication|alignment\b/.test(normalized)) {
      return "Strengthen stakeholder influence and alignment";
    }
    if (/\bescalation|delegate decisions earlier|operational escalations\b/.test(normalized)) {
      return "Delegate decisions earlier and reduce escalations";
    }
    if (/\bdelegation rhythm|ownership|coach|team\b/.test(normalized)) {
      return "Build delegation rhythm and team ownership";
    }
    if (/\bbusiness|impact|dashboard|metric|escalation|execution|program delivery\b/.test(normalized)) {
      return "Connect program execution to measurable business impact";
    }
    if (/\bregional|next-role|aspiration|leadership role\b/.test(normalized)) {
      return "Prepare for regional program operations leadership";
    }
    if (/\bself-awareness|habit|reflection|learning\b/.test(normalized)) {
      return "Turn self-awareness into visible leadership habits";
    }
  }

  const firstSentence = cleanEvidenceText(text).split(/[.!?\n]/)[0]?.trim() || "";
  const compact = firstSentence.length > 84 ? `${firstSentence.slice(0, 81)}...` : firstSentence;
  if (!compact && fallbackTitle) return fallbackTitle;
  if (!compact) return isArabic ? "تحويل الدليل إلى أولوية تطوير" : "Turn evidence into a development priority";
  return isArabic ? `تطوير: ${compact}` : `Develop: ${compact}`;
};

const applyEvidenceGroundingToLocalData = ({
  idpData,
  enterpriseContext,
  priorityCount,
  language,
}: {
  idpData: any;
  enterpriseContext: EnterpriseIdpContext;
  priorityCount: number;
  language?: string;
}) => {
  const isArabic = language === "ar";
  const confirmedInsights = enterpriseContext.confirmedInsights.filter((insight) => insight.status !== "removed");
  const categoryWeight: Partial<Record<ExtractedInsightCategory, number>> = {
    development_area: 1,
    manager_expectation: 2,
    business_priority: 3,
    role_expectation: 4,
    participant_aspiration: 5,
    competency: 6,
    assessment_theme: 7,
    program_theme: 8,
  };
  const confidenceWeight = { high: 0, medium: 1, low: 2 };
  const sortedPriorityInsights = confirmedInsights
    .filter((insight) =>
      [
        "assessment_theme",
        "program_theme",
        "competency",
        "role_expectation",
        "business_priority",
        "manager_expectation",
        "development_area",
        "participant_aspiration",
      ].includes(insight.category)
    )
    .sort((a, b) => {
      const categoryDelta = (categoryWeight[a.category] ?? 20) - (categoryWeight[b.category] ?? 20);
      if (categoryDelta !== 0) return categoryDelta;
      return confidenceWeight[a.confidence] - confidenceWeight[b.confidence];
    });
  const priorityInsights: ExtractedInsight[] = [];
  const usedPriorityTitles = new Set<string>();

  for (const insight of sortedPriorityInsights) {
    const title = createEvidenceGroundedObjectiveTitle(insight, isArabic);
    const key = title.toLowerCase();
    if (usedPriorityTitles.has(key)) continue;
    usedPriorityTitles.add(key);
    priorityInsights.push(insight);
    if (priorityInsights.length >= priorityCount) break;
  }

  if (priorityInsights.length < priorityCount) {
    for (const insight of sortedPriorityInsights) {
      if (priorityInsights.includes(insight)) continue;
      priorityInsights.push(insight);
      if (priorityInsights.length >= priorityCount) break;
    }
  }

  if (priorityInsights.length === 0) return idpData;

  const fallbackObjectives = Array.isArray(idpData.objectives) ? idpData.objectives : [];
  const usedTitles = new Set<string>();
  const groundedObjectives = priorityInsights.map((insight, index) => {
    const fallback = fallbackObjectives[index] || fallbackObjectives[0] || {};
    const evidenceText = cleanEvidenceText(insight.text);
    let title = createEvidenceGroundedObjectiveTitle(insight, isArabic, fallback.title);
    if (usedTitles.has(title.toLowerCase()) && fallback.title) {
      title = fallback.title;
    }
    usedTitles.add(title.toLowerCase());

    return {
      ...fallback,
      title,
      description: isArabic
        ? `تعتمد هذه الأولوية على دليل مؤكد من ${sourceLabels[insight.sourceType] || "مصدر"}: ${evidenceText}`
        : `This priority is grounded in confirmed ${sourceLabels[insight.sourceType] || "source"} evidence: ${evidenceText}`,
      measurable: isArabic
        ? "الاتفاق مع المدير على سلوك قابل للملاحظة، مقياس أثر، ومراجعة تقدم في فترة الخطة."
        : "Agree with the manager on an observable behavior, impact measure, and progress review within the configured IDP period.",
      criticality: insight.confidence === "high" ? "high" : fallback.criticality || "medium",
      sourceEvidence: buildSourceEvidence([insight]),
      evidenceConfidence: insight.confidence,
      userConfirmed: insight.userConfirmed,
      aiInferred: insight.aiInferred,
    };
  });

  return {
    ...idpData,
    objectives: groundedObjectives,
    summaryAdvice: isArabic
      ? "هذه المسودة المحلية مبنية على الأدلة المؤكدة، مدخلات المشارك، ومدخلات المدير المتاحة. راجع الأولويات مع المدير قبل الاعتماد النهائي."
      : "This local draft is grounded in the confirmed evidence, participant inputs, and manager inputs available. Review the priorities with the manager before finalizing.",
  };
};

const buildLocalIdpData = (
  employeeDetails: ReturnType<typeof normalizeEmployeeDetails>,
  manualInput: string | undefined,
  language: string | undefined
) => {
  const isArabic = language === "ar";
  const role = employeeDetails.position || "current role";
  const department = employeeDetails.department || "the team";
  const manual = manualInput?.trim();

  const objectives = isArabic
    ? [
        {
          title: "تعزيز التفكير الاستراتيجي",
          description: `تطوير قدرة ${employeeDetails.employeeName} على ربط أولويات ${department} بأهداف العمل طويلة المدى.`,
          measurable: "تقديم خارطة طريق ربع سنوية تحتوي على 3 مبادرات ذات أثر واضح ومؤشرات نجاح محددة.",
          criticality: "high" as const,
          recommendations: {
            experiential: ["قيادة مشروع تحسين متعدد الفرق", "تحليل تحد تشغيلي وتحويله إلى خطة عمل", "عرض توصيات شهرية على الإدارة"],
            social: ["الحصول على إرشاد من قائد خبير", "طلب تغذية راجعة من أصحاب المصلحة", "مشاركة التعلم مع الفريق"],
            formal: ["إكمال دورة في التفكير الاستراتيجي", "قراءة كتاب عن الاستراتيجية", "حضور ورشة تخطيط أعمال"],
          },
        },
        {
          title: "تحسين التواصل مع أصحاب المصلحة",
          description: "بناء أسلوب تواصل واضح ومؤثر مع الفرق والمديرين والشركاء.",
          measurable: "تحسين رضا أصحاب المصلحة وتحقيق توافق واضح قبل بدء المبادرات المهمة.",
          criticality: "high" as const,
          recommendations: {
            experiential: ["إدارة اجتماع توافق أسبوعي", "إنشاء ملخصات تنفيذية مختصرة", "قيادة مراجعة بعد كل مشروع"],
            social: ["طلب ملاحظات على العروض", "مراقبة قائد متميز في الاجتماعات", "بناء شبكة علاقات داخلية"],
            formal: ["دورة في التواصل التنفيذي", "تدريب على العرض والإقناع", "قراءة مواد عن إدارة أصحاب المصلحة"],
          },
        },
        {
          title: "تطوير التفويض وتمكين الفريق",
          description: "زيادة قدرة الفريق على امتلاك النتائج مع تقليل الاعتماد على المدير في التفاصيل اليومية.",
          measurable: "تفويض 3 مسؤوليات أساسية ورفع استقلالية الفريق خلال 90 يوماً.",
          criticality: "medium" as const,
          recommendations: {
            experiential: ["تحديد مهام يمكن تفويضها", "تجربة نموذج متابعة أسبوعي", "تكليف أعضاء الفريق بقيادة أجزاء من المشاريع"],
            social: ["جلسات تدريب فردية", "مراجعة التفويض مع المدير", "تعلم ممارسات من قادة آخرين"],
            formal: ["دورة في التفويض", "ورشة قيادة الفرق", "قراءة عن التمكين والمساءلة"],
          },
        },
        {
          title: "تعزيز اتخاذ القرار المبني على البيانات",
          description: "استخدام البيانات لتحديد الأولويات وقياس الأداء وتحسين القرارات التشغيلية.",
          measurable: "إنشاء لوحة مؤشرات شهرية واستخدامها في 3 قرارات عملية.",
          criticality: "medium" as const,
          recommendations: {
            experiential: ["بناء لوحة مؤشرات", "تحليل أسباب مشكلة أداء", "استخدام البيانات في مراجعات الفريق"],
            social: ["التعاون مع محلل بيانات", "طلب مراجعة من خبير", "مشاركة الرؤى مع أصحاب المصلحة"],
            formal: ["دورة تحليل بيانات للأعمال", "تعلم أساسيات لوحات المؤشرات", "قراءة عن مؤشرات الأداء"],
          },
        },
        {
          title: "بناء مهارات التدريب وتنمية المواهب",
          description: "مساعدة أعضاء الفريق على النمو من خلال توجيه منتظم وخطط تطوير واضحة.",
          measurable: "إنشاء خطط تطوير لعضوين من الفريق وتنفيذ جلسات متابعة شهرية.",
          criticality: "medium" as const,
          recommendations: {
            experiential: ["إجراء جلسات تدريب شهرية", "تحديد أهداف نمو فردية", "متابعة تقدم أعضاء الفريق"],
            social: ["تلقي ملاحظات من الفريق", "ممارسة أسئلة تدريب فعالة", "طلب توجيه من مدير خبير"],
            formal: ["دورة تدريب للمديرين", "قراءة عن نموذج GROW", "ورشة إدارة الأداء"],
          },
        },
      ]
    : [
        {
          title: "Strengthen strategic thinking and planning",
          description: `Build ${employeeDetails.employeeName}'s ability to connect ${department} priorities with longer-term business outcomes in the ${role} role.`,
          measurable: "Create a quarterly roadmap with at least 3 prioritized initiatives, success metrics, and stakeholder sign-off.",
          criticality: "high" as const,
          recommendations: {
            experiential: [
              "Lead one cross-functional improvement project from diagnosis to implementation.",
              "Convert a recurring operational challenge into a 90-day action plan with measurable outcomes.",
              "Present a monthly business review that connects team activity to strategic priorities.",
            ],
            social: [
              "Schedule monthly mentoring with a senior leader to review strategic choices.",
              "Ask two key stakeholders for feedback on prioritization and business impact.",
              "Share lessons learned with the team after each milestone review.",
            ],
            formal: [
              "Complete a strategic thinking or business strategy course.",
              "Read a practical strategy book and summarize 3 concepts for the team.",
              "Attend a workshop on business planning or operating rhythm design.",
            ],
          },
        },
        {
          title: "Improve stakeholder communication and influence",
          description: "Develop a clearer, more proactive communication rhythm with managers, peers, and partner teams.",
          measurable: "Achieve agreed expectations with key stakeholders before each major initiative and reduce avoidable escalations.",
          criticality: "high" as const,
          recommendations: {
            experiential: [
              "Run a weekly stakeholder alignment meeting with decisions, owners, and risks documented.",
              "Create concise executive updates for active projects using a standard one-page format.",
              "Facilitate a post-project review focused on communication quality and decision clarity.",
            ],
            social: [
              "Request feedback from three stakeholders after major presentations.",
              "Shadow a leader known for strong stakeholder management.",
              "Build a peer network across adjacent teams to identify concerns early.",
            ],
            formal: [
              "Take a course in executive communication or influencing without authority.",
              "Practice presentation storytelling with a structured feedback checklist.",
              "Read a stakeholder management guide and apply it to one active project.",
            ],
          },
        },
        {
          title: "Delegate effectively and empower the team",
          description: "Increase team ownership by delegating outcomes, not only tasks, while keeping accountability visible.",
          measurable: "Delegate 3 recurring responsibilities and improve team follow-through over the next 90 days.",
          criticality: "medium" as const,
          recommendations: {
            experiential: [
              "Map current responsibilities and identify work that can be delegated safely.",
              "Pilot a weekly ownership review with clear success criteria and support needs.",
              "Assign team members to lead defined parts of projects and report progress.",
            ],
            social: [
              "Hold coaching conversations with each team member about readiness and growth goals.",
              "Review delegation choices with the direct manager every month.",
              "Learn delegation practices from another manager with a high-performing team.",
            ],
            formal: [
              "Complete a short course on delegation and accountability.",
              "Attend a people-management workshop focused on team empowerment.",
              "Read about situational leadership and apply it to delegation decisions.",
            ],
          },
        },
        {
          title: "Use data to improve decisions and execution",
          description: "Strengthen the habit of using operational evidence to prioritize work, diagnose problems, and measure progress.",
          measurable: "Build a monthly dashboard and use it to support at least 3 team decisions.",
          criticality: "medium" as const,
          recommendations: {
            experiential: [
              "Define 5 core performance indicators for the team and review them monthly.",
              "Analyze one recurring issue using root-cause and trend data.",
              "Use data in team meetings to decide priorities and next actions.",
            ],
            social: [
              "Partner with a data analyst or reporting expert to validate metrics.",
              "Ask stakeholders which measures best reflect business value.",
              "Share data insights with peers and invite challenge on interpretation.",
            ],
            formal: [
              "Complete a business analytics fundamentals course.",
              "Learn dashboard design basics for operational reporting.",
              "Read about KPI design and leading versus lagging indicators.",
            ],
          },
        },
        {
          title: "Build coaching capability and talent development",
          description: "Help team members grow through regular coaching, practical feedback, and individual development actions.",
          measurable: "Create development actions for at least 2 team members and complete monthly coaching check-ins.",
          criticality: "medium" as const,
          recommendations: {
            experiential: [
              "Run monthly one-to-one coaching sessions focused on goals and blockers.",
              "Create stretch opportunities for team members based on their development needs.",
              "Document feedback themes and follow up on agreed actions.",
            ],
            social: [
              "Ask team members for feedback on coaching usefulness.",
              "Practice GROW-style coaching questions with a peer or mentor.",
              "Observe an experienced manager conducting a development conversation.",
            ],
            formal: [
              "Complete a coaching skills for managers course.",
              "Study the GROW coaching model and apply it in one-to-one sessions.",
              "Attend a workshop on feedback, performance, and development planning.",
            ],
          },
        },
      ];

  const strengths = isArabic
    ? [
        { area: "تنفيذ العمليات", score: 84 },
        { area: "الالتزام بالتعلم", score: 82 },
        { area: "التعاون", score: 80 },
        { area: "ملكية النتائج", score: 78 },
        { area: "حل المشكلات", score: 76 },
      ]
    : [
        { area: "Operational execution", score: 84 },
        { area: "Learning agility", score: 82 },
        { area: "Collaboration", score: 80 },
        { area: "Ownership mindset", score: 78 },
        { area: "Problem solving", score: 76 },
      ];

  const gaps = isArabic
    ? [
        { area: "التفكير الاستراتيجي", score: 78 },
        { area: "التواصل مع أصحاب المصلحة", score: 76 },
        { area: "التفويض", score: 72 },
        { area: "اتخاذ القرار بالبيانات", score: 70 },
        { area: "تدريب الفريق", score: 68 },
      ]
    : [
        { area: "Strategic thinking", score: 78 },
        { area: "Stakeholder communication", score: 76 },
        { area: "Delegation", score: 72 },
        { area: "Data-driven decision making", score: 70 },
        { area: "Team coaching", score: 68 },
      ];

  return {
    objectives,
    strengths,
    gaps,
    growModel: isArabic
      ? {
          goal: `تمكين ${employeeDetails.employeeName} من قيادة نتائج ذات أثر أعلى في دور ${role}.`,
          reality: manual || "توجد فرص لتقوية التفكير الاستراتيجي والتفويض والتواصل واستخدام البيانات.",
          options: ["قيادة مشروع عملي", "الحصول على إرشاد منتظم", "تطبيق مؤشرات أداء شهرية", "تدريب أعضاء الفريق"],
          willDo: ["تحديد أولويات ربع سنوية", "طلب تغذية راجعة شهرية", "تفويض مسؤوليات محددة", "متابعة التقدم بالمؤشرات"],
        }
      : {
          goal: `Enable ${employeeDetails.employeeName} to deliver higher-impact outcomes in the ${role} role.`,
          reality:
            manual ||
            "Current inputs point to opportunities in strategic thinking, delegation, stakeholder communication, data use, and team coaching.",
          options: [
            "Lead a focused cross-functional improvement project.",
            "Set up monthly mentoring with a senior leader.",
            "Use a practical dashboard to guide execution decisions.",
            "Create individual coaching actions for team members.",
          ],
          willDo: [
            "Define quarterly priorities and success metrics.",
            "Request monthly feedback from key stakeholders.",
            "Delegate specific outcomes with clear checkpoints.",
            "Review progress through a simple KPI dashboard.",
          ],
        },
    summaryAdvice: isArabic
      ? `تعتمد هذه الخطة على معلومات الموظف والمدخلات اليدوية${manual ? `: ${manual}` : ""}. ركز خلال الأشهر الثلاثة القادمة على أهداف قليلة عالية الأثر، واجعل التقدم مرئياً من خلال مؤشرات واضحة وتغذية راجعة منتظمة.`
      : `This locally generated IDP is based on the employee profile and manual input${manual ? `: ${manual}` : ""}. Over the next 90 days, focus on a small number of high-impact goals, make progress visible through clear metrics, and use regular stakeholder feedback to refine execution.`,
  };
};

const addLeadershipReflectionFields = (
  idpData: any,
  employeeDetails: ReturnType<typeof normalizeEmployeeDetails>,
  manualInput: string | undefined,
  language: string | undefined,
  enterpriseContext?: EnterpriseIdpContext,
  options?: {
    leadershipAreas?: AdminConfiguration["idp"]["leadershipAreas"];
    priorityCount?: number;
    reviewPeriod?: string | null;
  }
) => {
  const isArabic = language === "ar";
  const manual = manualInput?.trim();
  const reviewDate = new Date(employeeDetails.dateOfIdpCreation);
  reviewDate.setDate(reviewDate.getDate() + getReviewPeriodDays(options?.reviewPeriod || enterpriseContext?.participantProfile.reviewPeriod));
  const reviewDateIso = reviewDate.toISOString();

  const confidenceScores = Array.from((manual || "").matchAll(/:\s*([1-5])\/5/g)).map(
    (match) => Number(match[1])
  );
  const confidenceScore =
    confidenceScores.length > 0
      ? Math.round((confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length) * 20)
      : 70;

  const firstActions = (objective: any) => [
    ...(objective?.recommendations?.experiential || []),
    ...(objective?.recommendations?.social || []),
    ...(objective?.recommendations?.formal || []),
  ].slice(0, 3);

  const existingObjectives = Array.isArray(idpData.objectives) ? idpData.objectives : [];
  const fallbackPriorities = isArabic
    ? [
        {
          title: "قيادة الذات بوضوح ووعي",
          description: "تحويل التعلم إلى عادات قيادية يومية أكثر وضوحاً واتساقاً.",
          measurable: "مراجعة أسبوعية للسلوكيات القيادية وتطبيق عادة واحدة جديدة خلال 30 يوماً.",
          criticality: "high" as const,
          recommendations: {
            experiential: ["تطبيق عادة قيادة واحدة في الاجتماعات الأسبوعية", "تحديد قرار واحد يحتاج إلى توقف وتفكير", "توثيق أثر السلوك الجديد"],
            social: ["طلب ملاحظات من المدير", "مناقشة التعلم مع زميل موثوق", "ملاحظة قائد يتميز بالوضوح"],
            formal: ["قراءة موجزة عن الوعي الذاتي القيادي", "إكمال تدريب قصير في الأولويات", "حضور جلسة عن المرونة القيادية"],
          },
        },
        {
          title: "تقوية ملكية الفريق والتدريب",
          description: "بناء فريق يشعر بملكية أكبر للنتائج ويتلقى تدريباً عملياً منتظماً.",
          measurable: "تفويض نتيجتين واضحتين وتنفيذ محادثات تدريب شهرية مع أعضاء الفريق.",
          criticality: "high" as const,
          recommendations: {
            experiential: ["تفويض نتيجة محددة لشخص مناسب", "إجراء محادثة تدريب أسبوعية", "مراجعة تقدم الفريق بدون استعادة العمل"],
            social: ["طلب ملاحظات من الفريق", "تعلم أسلوب التفويض من قائد آخر", "الاتفاق مع المدير على حدود التفويض"],
            formal: ["دورة قصيرة في التدريب", "قراءة عن التفويض", "ورشة عن بناء الثقة"],
          },
        },
        {
          title: "ربط القيادة بأثر الأعمال",
          description: "توضيح كيف تخلق القرارات والسلوكيات القيادية قيمة للأعمال وأصحاب المصلحة.",
          measurable: "تحديد 3 مؤشرات أثر ومراجعتها مع أصحاب المصلحة خلال 90 يوماً.",
          criticality: "medium" as const,
          recommendations: {
            experiential: ["إنشاء خريطة أصحاب مصلحة", "ربط مبادرة واحدة بنتيجة عمل", "عرض تقدم شهري مختصر"],
            social: ["الحصول على ملاحظات من أصحاب المصلحة", "مراجعة الأولويات مع المدير", "بناء توافق مبكر قبل التنفيذ"],
            formal: ["تعلم أساسيات التفكير الاستراتيجي", "قراءة عن إدارة أصحاب المصلحة", "حضور جلسة عن قياس الأثر"],
          },
        },
      ]
    : [
        {
          title: "Lead self with clearer intent",
          description: "Turn programme learning into practical leadership habits that make decisions, priorities, and communication more intentional.",
          measurable: "Run a weekly leadership reflection, apply one new habit, and collect feedback on visible behaviour change within 30 days.",
          criticality: "high" as const,
          recommendations: {
            experiential: [
              "Choose one leadership habit to practice in weekly meetings.",
              "Pause before one important decision each week and document the trade-offs.",
              "Review what changed in behaviour and impact at the end of each week.",
            ],
            social: [
              "Ask the direct manager for feedback on clarity and prioritization.",
              "Discuss one learning moment with a trusted peer.",
              "Observe a leader who demonstrates calm, intentional decision making.",
            ],
            formal: [
              "Complete a short learning module on self-awareness or prioritization.",
              "Read one practical article on leadership habits.",
              "Attend a session on resilience or focused execution.",
            ],
          },
        },
        {
          title: "Build stronger team ownership",
          description: "Create a team experience where people have clearer ownership, better coaching, and more confidence to act.",
          measurable: "Delegate two outcomes, hold monthly coaching conversations, and review ownership progress over 60 days.",
          criticality: "high" as const,
          recommendations: {
            experiential: [
              "Delegate one outcome with success criteria and decision rights.",
              "Use one coaching question in every one-to-one conversation.",
              "Review team ownership without taking back the work too quickly.",
            ],
            social: [
              "Ask team members what support helps them take ownership.",
              "Learn delegation practices from a high-performing peer manager.",
              "Align with the direct manager on what can be safely delegated.",
            ],
            formal: [
              "Complete a short coaching skills course.",
              "Read about delegation and accountability.",
              "Attend a workshop on team trust and performance conversations.",
            ],
          },
        },
        {
          title: "Increase business and stakeholder impact",
          description: "Connect leadership behaviour to stakeholder confidence, clearer priorities, and measurable business outcomes.",
          measurable: "Define 3 impact measures, align with key stakeholders, and show progress in a 90-day review.",
          criticality: "medium" as const,
          recommendations: {
            experiential: [
              "Create a simple stakeholder map for one strategic priority.",
              "Connect one initiative to a measurable business outcome.",
              "Share a concise monthly progress update with stakeholders.",
            ],
            social: [
              "Ask stakeholders what would make collaboration easier.",
              "Review business priorities with the direct manager.",
              "Create early alignment before execution begins.",
            ],
            formal: [
              "Complete a strategic thinking refresher.",
              "Read a practical stakeholder management guide.",
              "Learn one method for measuring business impact.",
            ],
          },
        },
      ];

  const configuredLeadershipAreas = options?.leadershipAreas || {
    leadingSelf: true,
    leadingTeam: true,
    leadingBusiness: true,
  };
  const dimensionEntries = [
    { enabled: true, fallbackIndex: 0, label: isArabic ? "قيادة الذات" : "Leading Self" },
    { enabled: configuredLeadershipAreas.leadingTeam, fallbackIndex: 1, label: isArabic ? "قيادة الفريق" : "Leading Team" },
    { enabled: configuredLeadershipAreas.leadingBusiness, fallbackIndex: 2, label: isArabic ? "قيادة الأعمال" : "Leading Business" },
  ].filter((item) => item.enabled);
  const dimensions = dimensionEntries.map((item) => item.label);
  const configuredPriorityCount = Math.max(1, Math.min(5, options?.priorityCount || existingObjectives.length || 3));
  const enabledFallbackPriorities = dimensionEntries
    .map((item) => fallbackPriorities[item.fallbackIndex])
    .filter(Boolean);
  const fallbackPriorityPool = enabledFallbackPriorities.length > 0 ? enabledFallbackPriorities : [fallbackPriorities[0]];

  const priorities = Array.from({ length: configuredPriorityCount }).map((_, index) => {
    const fallback = fallbackPriorityPool[index % fallbackPriorityPool.length];
    const source = existingObjectives[index] || {};
    const actions = firstActions(source);
    const sourceEvidence = buildSourceEvidence(enterpriseContext?.confirmedInsights || []);
    return {
      ...fallback,
      ...source,
      title: source.title || fallback.title,
      description: source.description || fallback.description,
      measurable: source.measurable || fallback.measurable,
      criticality: source.criticality || fallback.criticality,
      recommendations: source.recommendations || fallback.recommendations,
      dimension: dimensions[index % dimensions.length],
      whyThisMatters: isArabic
        ? "هذا الأمر مهم لأنه يحول التعلم إلى سلوك واضح يمكن ملاحظته وقياس أثره."
        : "This matters because it turns learning into visible behaviour that others can notice and support.",
      expectedBusinessImpact: isArabic
        ? "وضوح أعلى في الأولويات، تعاون أفضل مع أصحاب المصلحة، ونتائج أكثر قابلية للقياس."
        : "Clearer priorities, stronger stakeholder confidence, and more measurable execution outcomes.",
      recommendedActions: actions.length > 0 ? actions : firstActions(fallback),
      evidenceOfSuccess: isArabic
        ? "تغذية راجعة أفضل، قرارات أوضح، ومراجعة تقدم تظهر تغيراً في السلوك والأثر."
        : "Better feedback, clearer decisions, and a progress review showing behaviour and impact change.",
      targetReviewDate: reviewDateIso,
      latestReflection: "",
      evidenceUploaded: [],
      managerFeedback: "",
      reviewDate: reviewDateIso,
      nextAction: actions[0] || fallback.recommendations.experiential[0],
      checkIns: [],
      sourceEvidence,
      evidenceConfidence: sourceEvidence[0]?.confidence || "medium",
      userConfirmed: sourceEvidence.some((item) => item.userConfirmed),
      aiInferred: sourceEvidence.some((item) => item.aiInferred),
    };
  });
  const priorityTitles = priorities.map((priority: any) => priority.title).filter(Boolean);
  const managerName = employeeDetails.directManager || (isArabic ? "المدير" : "the manager");

  const commitments = isArabic
    ? {
        start: "سأبدأ بتحويل التعلم إلى محادثات وأفعال أسبوعية واضحة.",
        stop: "سأتوقف عن التعامل مع كل أمر عاجل بالطريقة نفسها دون تحديد الأولويات.",
        continue: "سأستمر في طلب التغذية الراجعة والتعلم من التجربة.",
        experiment: "سأجرب سؤالاً تدريبياً واحداً في محادثاتي الأسبوعية.",
        success: "سيبدو النجاح كوضوح أكبر وملكية أعلى من الفريق وأثر أعمال مرئي.",
        reviewDate: reviewDateIso,
      }
    : {
        start: "I will start turning programme insights into visible weekly leadership actions.",
        stop: "I will stop treating every urgent request as equally important before clarifying priorities.",
        continue: "I will continue asking for feedback and learning from real leadership moments.",
        experiment: "I will experiment with one coaching question in weekly conversations.",
        success: "Success will look like clearer priorities, stronger team ownership, and visible business impact.",
        reviewDate: reviewDateIso,
      };

  const actionPlan = isArabic
    ? {
        thirtyDays: ["تحديد أهم 3 أولويات قيادية", "طلب ملاحظات من المدير وأصحاب المصلحة", "تجربة عادة قيادة واحدة أسبوعياً"],
        sixtyDays: ["تفويض نتيجتين واضحتين", "تنفيذ محادثات تدريب منتظمة", "مراجعة التقدم باستخدام مؤشرات بسيطة"],
        ninetyDays: ["عرض أثر الأعمال", "مراجعة السلوكيات التي تغيرت", "تحديث الخطة مع المدير"],
      }
    : {
        thirtyDays: [
          `Align the three development priorities with ${managerName} and agree on success evidence.`,
          `Create baseline evidence for ${priorityTitles[0] || "the first priority"}.`,
          "Choose one visible action to practice each week and capture feedback.",
        ],
        sixtyDays: [
          `Apply ${priorityTitles[1] || "the second priority"} through live work or a stretch assignment.`,
          "Use peer, stakeholder, or manager feedback to adjust the behaviour.",
          "Review progress using simple evidence instead of self-assessment alone.",
        ],
        ninetyDays: [
          `Show progress against ${priorityTitles[2] || "the third priority"} and the other agreed measures.`,
          "Document what changed in behaviour, stakeholder confidence, and business impact.",
          `Refresh the next development cycle with ${managerName}.`,
        ],
      };

  const managerGuide = isArabic
    ? {
        keyLearnings: ["ما تعلمته من البرنامج", "السلوكيات التي أريد تغييرها", "الأولويات التي ستخلق أكبر أثر"],
        supportNeeded: ["تغذية راجعة شهرية", "وضوح حول الأولويات", "فرص لتطبيق السلوكيات الجديدة"],
        resourcesRequired: ["وقت للتجربة والمراجعة", "وصول إلى أصحاب المصلحة", "إرشاد أو تدريب عند الحاجة"],
        questionsForManager: ["ما السلوك الذي يجب أن أركز عليه أولاً؟", "أين يمكنني خلق أكبر أثر؟", "كيف سنراجع التقدم؟"],
        discussionAgenda: ["مراجعة التعلم", "الاتفاق على الأولويات", "تحديد الدعم", "تثبيت موعد مراجعة"],
      }
    : {
        keyLearnings: priorityTitles.length > 0
          ? priorityTitles.map((title: string) => `Development focus: ${title}.`)
          : ["The behaviours I want to change.", "The priorities that can create the most impact."],
        supportNeeded: [
          "Monthly feedback on visible behaviour change.",
          "Clarity on which work opportunities can be used for practice.",
          "A short 30-60-90 review cadence with the manager.",
        ],
        resourcesRequired: [
          "Time to experiment, reflect, and document evidence.",
          "Access to key stakeholders or live project opportunities.",
          "Mentoring, coaching, or formal learning where the action plan requires it.",
        ],
        questionsForManager: [
          "Which behaviour should I focus on first?",
          "Where can I create the greatest impact in the next 90 days?",
          "What evidence would convince us that progress is real?",
          "What support or opportunity can you help unlock?",
        ],
        discussionAgenda: [
          "Review the executive summary and current progress.",
          "Agree on the three development priorities.",
          "Confirm the development actions, support needed, and review dates.",
          "Set the next progress conversation.",
        ],
      };

  const leadershipSummary = isArabic
    ? {
        leadershipTheme: "تحويل التعلم إلى أثر قيادي واضح",
        topStrengths: (idpData.strengths || []).slice(0, 3).map((item: any) => item.area),
        growthOpportunities: (idpData.gaps || []).slice(0, 3).map((item: any) => item.area),
        threeLeadershipPriorities: priorities.map((priority: any) => priority.title),
        keyCommitments: [commitments.start, commitments.stop, commitments.experiment],
        dayFocus: "30 يوماً للوضوح، 60 يوماً للسلوك، 90 يوماً للأثر.",
        managerSupportNeeded: managerGuide.supportNeeded,
      }
    : {
        leadershipTheme: "Turning learning into visible leadership impact",
        topStrengths: (idpData.strengths || []).slice(0, 3).map((item: any) => item.area),
        growthOpportunities: (idpData.gaps || []).slice(0, 3).map((item: any) => item.area),
        threeLeadershipPriorities: priorities.map((priority: any) => priority.title),
        keyCommitments: [commitments.start, commitments.stop, commitments.experiment],
        dayFocus: "30 days for clarity, 60 days for behaviour, 90 days for impact.",
        managerSupportNeeded: managerGuide.supportNeeded,
      };

  const themesForDimension = (label: string) =>
    priorities
      .filter((priority: any) => priority.dimension === label)
      .map((priority: any) => priority.title)
      .filter(Boolean);
  const selfLabel = isArabic ? "قيادة الذات" : "Leading Self";
  const teamLabel = isArabic ? "قيادة الفريق" : "Leading Team";
  const businessLabel = isArabic ? "قيادة الأعمال" : "Leading Business";

  const enterpriseMetadata = {
    idpMode: enterpriseContext?.selectedMode || "program_based",
    supportingSources: enterpriseContext?.supportingSources || [],
    developmentFramework: enterpriseContext?.developmentFramework || "experience_people_learning",
    outputLanguage: language || "en",
    outputLanguageName: getOutputLanguageName(language),
    organizationName: enterpriseContext?.organizationContext.organizationName || employeeDetails.company,
    reportConfiguration: enterpriseContext?.organizationContext.idpReportConfiguration,
    revisionConfiguration: enterpriseContext?.organizationContext.revisionConfiguration,
    reviewPeriod: options?.reviewPeriod || enterpriseContext?.participantProfile.reviewPeriod || null,
    leadershipDimensions: dimensions,
    evidenceCount: enterpriseContext?.confirmedInsights.length || 0,
    leadingSelfThemes: themesForDimension(selfLabel),
    leadingTeamThemes: themesForDimension(teamLabel),
    leadingBusinessThemes: themesForDimension(businessLabel),
    mostCommonLeadershipPriorities: priorities.map((priority: any) => priority.title),
    mostCommonCommitments: [commitments.start, commitments.stop, commitments.experiment],
    confidenceScore,
    programmeCompletion: manual?.includes("Programme completed: Not specified") ? "not_specified" : "completed",
    managerReviewStatus: "not_started",
  };

  const growModel = {
    ...(idpData.growModel || {}),
    goal:
      idpData.growModel?.goal ||
      (isArabic
        ? `تحويل تعلم ${employeeDetails.employeeName} إلى أثر قيادي قابل للملاحظة.`
        : `Turn ${employeeDetails.employeeName}'s learning into visible leadership impact.`),
    reality:
      idpData.growModel?.reality ||
      (manual || "The learner has reflected on leadership behaviours, business impact, and manager support."),
    options:
      idpData.growModel?.options ||
      priorities.map((priority: any) => priority.title),
    willDo:
      idpData.growModel?.willDo ||
      [commitments.start, commitments.stop, commitments.experiment],
    leadershipSummary,
    commitments,
    actionPlan,
    managerGuide,
    enterpriseMetadata,
  };

  return {
    ...idpData,
    objectives: priorities,
    growModel,
    leadershipSummary,
    commitments,
    actionPlan,
    managerGuide,
    enterpriseMetadata,
    summaryAdvice: isArabic
      ? `هذه خطة تأمل قيادي موجزة مبنية على مدخلات المتعلم${manual ? " وملاحظاته" : ""}. ركز خلال 90 يوماً على ثلاث أولويات عالية الأثر، واجعل التقدم قابلاً للملاحظة من خلال السلوك والتغذية الراجعة وأثر الأعمال.`
      : `This leadership reflection plan is based on the learner's profile and reflection inputs${manual ? "" : "."}. Over the next 90 days, focus on three high-impact priorities, make behaviour change visible, and use manager feedback to turn learning into business impact.`,
  };
};

const saveLocalIdpRecord = ({
  employeeDetails,
  uploadedFiles,
  manualInput,
  organizationLogo,
  idpData,
  idpMode,
  supportingSources,
  sourceFiles,
  contextInputs,
  extractedInsights,
  confirmedInsights,
  developmentFramework,
  organizationConfig,
  aspiration,
  reviewPeriod,
  recordStatus = "completed",
  managerReview,
}: {
  employeeDetails: ReturnType<typeof normalizeEmployeeDetails>;
  uploadedFiles: Array<z.infer<typeof uploadedFileSchema>>;
  manualInput?: string;
  organizationLogo?: string;
  idpData: any;
  idpMode?: IdpMode;
  supportingSources?: SupportingSourceType[];
  sourceFiles?: UploadedSourceFile[];
  contextInputs?: EnterpriseContextInputs;
  extractedInsights?: ExtractedInsight[];
  confirmedInsights?: ExtractedInsight[];
  developmentFramework?: DevelopmentFramework;
  organizationConfig?: z.infer<typeof organizationConfigSchema>;
  aspiration?: string;
  reviewPeriod?: string;
  recordStatus?: IdpRecordStatus;
  managerReview?: ManagerReview;
}) => {
  const id = nextLocalIdpId++;
  const now = new Date();
  const objectivesWithProgress = idpData.objectives.map((obj: any) => ({
    ...obj,
    status: obj.status || ("not_started" as const),
    progress: obj.progress || 0,
    latestReflection: obj.latestReflection || "",
    evidenceUploaded: obj.evidenceUploaded || [],
    managerFeedback: obj.managerFeedback || "",
    reviewDate: obj.reviewDate || obj.targetReviewDate,
    nextAction: obj.nextAction || obj.recommendedActions?.[0] || "",
    checkIns: obj.checkIns || [],
  }));

  const record = {
    id,
    userId: 1,
    employeeName: employeeDetails.employeeName,
    position: employeeDetails.position || null,
    company: employeeDetails.company,
    department: employeeDetails.department || "",
    yearsOfExperience: employeeDetails.yearsOfExperience || 0,
    dateOfJoining: employeeDetails.dateOfJoining,
    dateOfIdpCreation: employeeDetails.dateOfIdpCreation,
    directManager: employeeDetails.directManager || "",
    uploadedFiles,
    manualInput: manualInput || null,
    organizationLogo: organizationLogo || null,
    idpMode: idpMode || "program_based",
    supportingSources: supportingSources || [],
    sourceFiles: sourceFiles || toNormalizedSourceFiles(uploadedFiles),
    contextInputs: contextInputs || createEmptyEnterpriseContextInputs(),
    extractedInsights: extractedInsights || [],
    confirmedInsights: confirmedInsights || [],
    developmentFramework: developmentFramework || "experience_people_learning",
    organizationConfig: organizationConfig || {
      organizationName: employeeDetails.company,
      organizationLogo,
      approvedDevelopmentFramework: developmentFramework || "experience_people_learning",
    },
    aspiration: aspiration || null,
    reviewPeriod: reviewPeriod || null,
    objectives: objectivesWithProgress,
    strengths: idpData.strengths,
    gaps: idpData.gaps,
    growModel: idpData.growModel,
    leadershipSummary: idpData.leadershipSummary,
    commitments: idpData.commitments,
    actionPlan: idpData.actionPlan,
    managerGuide: idpData.managerGuide,
    enterpriseMetadata: idpData.enterpriseMetadata,
    managerReview: managerReview || createDefaultManagerReview(employeeDetails.directManager),
    checkIns: [],
    learningResources: null,
    summaryAdvice: idpData.summaryAdvice,
    employeeSignature: null,
    employeeSignedAt: null,
    managerSignature: null,
    managerSignedAt: null,
    status: recordStatus,
    createdAt: now,
    updatedAt: now,
  };

  setLocalIdpRecord(id, record);
  return { id, record };
};

const getLocalIdpRecord = (id: number) => localIdpRecords.get(id);

// IDP Router
const idpRouter = router({
  getEnterpriseDefaults: publicProcedure.query(async ({ ctx }) => {
    const config = normalizeAdminConfiguration(await getAdminConfiguration());
    const userOrganizationId = ctx.user?.organizationId || "";
    const selectedOrganization =
      (userOrganizationId
        ? config.organizations.find((organization) => organization.id === userOrganizationId)
        : null) ||
      config.organizations.find((organization) => organization.id === config.selectedOrganizationId) ||
      config.organization;
    const participantProfile = ctx.user
      ? config.participants.find(
          (participant) =>
            participant.id === ctx.user?.participantId ||
            participant.email.trim().toLowerCase() === (ctx.user?.email || "").trim().toLowerCase()
        ) || null
      : null;

    return {
      organization: selectedOrganization,
      participantProfile,
      program: config.program,
      idp: config.idp,
      evidence: {
        allowedFileTypes: config.evidence.allowedFileTypes,
        maxFileSizeMb: config.evidence.maxFileSizeMb,
        framework702010Mode: config.evidence.framework702010Mode,
        developmentFramework: config.evidence.developmentFramework,
        requiredEvidenceByProgram: config.evidence.requiredEvidenceByProgram,
        assessmentProviders: config.evidence.assessmentProviders,
        evidenceReviewStatus: config.evidence.evidenceReviewStatus,
      },
      companyKnowledge: {
        approvedDocumentCount: config.companyKnowledge.documents.filter(
          (document) =>
            document.organizationId === selectedOrganization.id &&
            document.reviewStatus === "approved" &&
            isCompanyDocumentCurrent(document)
        ).length,
        requireSourceReferences: config.companyKnowledge.requireSourceReferences,
        flagEvidenceConflicts: config.companyKnowledge.flagEvidenceConflicts,
      },
      report: config.report,
      revisions: config.revisions,
    };
  }),

  // Upload a file to S3
  uploadFile: publicProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().optional().default("application/octet-stream"),
        base64Data: z.string(),
        sourceType: supportingSourceSchema.optional().default("other"),
        fileSize: z.number().optional(),
        hash: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { filename, contentType, base64Data, sourceType } = input;
      const buffer = Buffer.from(base64Data, "base64");
      const size = input.fileSize ?? buffer.byteLength;
      validateUpload(filename, contentType, size);

      const safeName = sanitizeFileName(filename);
      const extension = getExtension(safeName);
      const hash = input.hash || createHash("sha256").update(buffer).digest("hex");
      const uniqueKey = `idp-uploads/${nanoid()}-${hash.slice(0, 12)}${extension}`;
      const uploadedAt = new Date().toISOString();
      const extractedText = extractTextFromUpload(safeName, contentType, buffer);
      const extractedSummary = summarizeExtractedText(extractedText, safeName);

      try {
        const result = await storagePut(uniqueKey, buffer, contentType);
        const id = nanoid();
        saveLocalUploadedDocument({
          id,
          name: safeName,
          url: result.url,
          key: result.key,
          sourceType,
          mimeType: contentType,
          size,
          hash,
          extractedText,
          extractedSummary,
          content: buffer,
          uploadedBy: ctx.user?.openId || ctx.user?.email || null,
          organizationId: ctx.user?.organizationId || null,
          uploadedAt,
        });

        return {
          id,
          name: safeName,
          url: result.url,
          key: result.key,
          sourceType,
          mimeType: contentType,
          size,
          hash,
          status: "ready" as const,
          progress: 100,
          uploadedAt,
          extractedText,
          extractedSummary,
        };
      } catch (error) {
        console.warn("[Storage] Upload failed, returning protected local metadata fallback:", error);
        const id = nanoid();
        saveLocalUploadedDocument({
          id,
          name: safeName,
          url: "",
          key: uniqueKey,
          sourceType,
          mimeType: contentType,
          size,
          hash,
          extractedText,
          extractedSummary,
          content: buffer,
          uploadedBy: ctx.user?.openId || ctx.user?.email || null,
          organizationId: ctx.user?.organizationId || null,
          uploadedAt,
        });
        return {
          id,
          name: safeName,
          url: "",
          key: uniqueKey,
          sourceType,
          mimeType: contentType,
          size,
          hash,
          status: "ready" as const,
          progress: 100,
          uploadedAt,
          extractedText,
          extractedSummary,
        };
      }
    }),

  extractInsights: publicProcedure
    .input(
      z.object({
        employeeDetails: z.object({
          employeeName: z.string(),
          position: z.string().optional(),
          company: z.string(),
          department: z.string().optional(),
          yearsOfExperience: z.number().optional(),
          dateOfJoining: z.date().optional().nullable(),
          dateOfIdpCreation: z.date().optional().nullable(),
          directManager: z.string().optional(),
        }),
        idpMode: idpModeSchema,
        supportingSources: z.array(supportingSourceSchema).optional().default([]),
        sourceFiles: z.array(sourceFileSchema).optional().default([]),
        contextInputs: contextInputsSchema.optional().default(createEmptyEnterpriseContextInputs()),
        aspiration: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sourceFiles = input.sourceFiles;
      const insights = buildExtractedInsights({
        contextInputs: input.contextInputs,
        sourceFiles,
        aspiration: input.aspiration,
      });

      return {
        insights,
        sourceSummary: {
          idpMode: input.idpMode,
          supportingSources: input.supportingSources,
          files: sourceFiles.map((file) => ({
            id: file.id,
            name: file.name,
            sourceType: file.sourceType,
            mimeType: file.mimeType,
            size: file.size,
            status: file.status,
          })),
        },
      };
    }),

  // Generate IDP using AI
  generateIdp: publicProcedure
    .input(
      z.object({
        employeeDetails: z.object({
          employeeName: z.string(),
          position: z.string().optional(),
          company: z.string(),
          department: z.string(),
          yearsOfExperience: z.number(),
          dateOfJoining: z.date().optional().nullable(),
          dateOfIdpCreation: z.date().optional().nullable(),
          directManager: z.string(),
        }),
        uploadedFiles: z.array(uploadedFileSchema),
        sourceFiles: z.array(sourceFileSchema).optional(),
        manualInput: z.string().optional(),
        organizationLogo: z.string().optional(),
        language: z.string().optional().default('en'),
        includeMethodology702010: z.boolean().optional().default(false),
        idpMode: idpModeSchema.optional().default("program_based"),
        supportingSources: z.array(supportingSourceSchema).optional().default([]),
        contextInputs: contextInputsSchema.optional().default(createEmptyEnterpriseContextInputs()),
        extractedInsights: z.array(extractedInsightSchema).optional().default([]),
        confirmedInsights: z.array(extractedInsightSchema).optional().default([]),
        developmentFramework: developmentFrameworkSchema.optional().default("experience_people_learning"),
        organizationConfig: organizationConfigSchema.optional(),
        aspiration: z.string().optional(),
        reviewPeriod: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        uploadedFiles,
        manualInput,
        organizationLogo,
        language,
        idpMode,
        supportingSources,
        contextInputs,
        extractedInsights,
        developmentFramework,
        organizationConfig,
        aspiration,
        reviewPeriod,
      } = input;
      const employeeDetails = normalizeEmployeeDetails(input.employeeDetails);
      const rawParticipantSourceFiles = input.sourceFiles?.length
        ? input.sourceFiles
        : toNormalizedSourceFiles(uploadedFiles);
      const adminConfig = normalizeAdminConfiguration(await getAdminConfiguration());
      const participantSourceFiles = getEnabledParticipantSourceFiles(rawParticipantSourceFiles, adminConfig);
      const matchedOrganization = resolveAdminOrganization({
        adminConfig,
        organizationConfig,
        employeeCompany: employeeDetails.company,
        userOrganizationId: ctx.user?.organizationId,
      });
      const participantProfile = ctx.user
        ? adminConfig.participants.find(
            (participant) =>
              participant.id === ctx.user?.participantId ||
              participant.email.trim().toLowerCase() === (ctx.user?.email || "").trim().toLowerCase()
          ) || null
        : null;
      const approvedCompanyDocuments = getApprovedCompanyDocuments(adminConfig, matchedOrganization.id);
      const companySourceFiles = approvedCompanyDocuments.map(toCompanySourceFile);
      const programSourceFiles = adminConfig.program.documents
        .filter((document) => document.status !== "removed" && (document.extractedText || document.extractedSummary))
        .map((document): UploadedSourceFile => ({
          id: document.id,
          name: document.name,
          url: document.url || undefined,
          key: document.key || `program/${document.id}`,
          sourceType: "program",
          mimeType: document.mimeType,
          size: document.size,
          hash: document.hash || document.id,
          status: "ready",
          progress: 100,
          uploadedAt: document.uploadedAt,
          extractedText: document.extractedText || document.extractedSummary || "",
          extractedSummary: document.extractedSummary || "",
        }));
      const adminDrivenSupportingSources = Array.from(
        new Set<SupportingSourceType>([
          ...supportingSources.filter((source) => adminConfig.idp.enabledEvidenceSections.includes(source)),
          ...participantSourceFiles.map((file) => file.sourceType),
          ...companySourceFiles.map((file) => file.sourceType),
          "manager_notes",
          "participant_goals",
        ])
      );
      const effectiveFramework = getAdminDrivenDevelopmentFramework(
        adminConfig,
        developmentFramework,
        input.includeMethodology702010
      );
      const programDocumentText = joinConfiguredText(
        adminConfig.program.documents.map((document) => document.extractedText || document.extractedSummary)
      );
      const competencyText = joinConfiguredText(
        approvedCompanyDocuments
          .filter((document) => document.category === "leadership_competency_framework")
          .map((document) => document.extractedText || document.extractedSummary)
      );
      const roleArchitectureText = joinConfiguredText(
        approvedCompanyDocuments
          .filter(
            (document) =>
              document.category === "role_career_architecture" ||
              document.category === "organization_structure" ||
              document.category === "role_job_description"
          )
          .map((document) => document.extractedText || document.extractedSummary)
      );
      const successProfileText = joinConfiguredText(
        approvedCompanyDocuments
          .filter((document) => document.category === "success_profile")
          .map((document) => document.extractedText || document.extractedSummary)
      );
      const effectiveOrganizationConfig = {
        ...organizationConfig,
        organizationName: organizationConfig?.organizationName || matchedOrganization.organizationName || employeeDetails.company,
        organizationLogo: organizationConfig?.organizationLogo || matchedOrganization.logoUrl,
        brandColors:
          organizationConfig?.brandColors ||
          {
            primary: matchedOrganization.primaryColor,
            secondary: matchedOrganization.secondaryColor,
          },
        competencyFramework: joinConfiguredText([organizationConfig?.competencyFramework, competencyText]),
        leadershipFramework: joinConfiguredText([organizationConfig?.leadershipFramework, competencyText]),
        programObjectives: joinConfiguredText([
          organizationConfig?.programObjectives,
          contextInputs.program.objectives,
          adminConfig.program.objectives,
          programDocumentText,
        ]),
        roleArchitecture: joinConfiguredText([organizationConfig?.roleArchitecture, roleArchitectureText]),
        successProfiles: joinConfiguredText([organizationConfig?.successProfiles, successProfileText]),
        approvedDevelopmentFramework: effectiveFramework,
        idpOutputTemplate: organizationConfig?.idpOutputTemplate || adminConfig.report.template,
        idpReportConfiguration: organizationConfig?.idpReportConfiguration || adminConfig.report,
        revisionConfiguration: organizationConfig?.revisionConfiguration || adminConfig.revisions,
      };
      const sourceFiles = Array.from(
        new Map(
          [...participantSourceFiles, ...programSourceFiles, ...companySourceFiles].map((file) => [
            file.hash || file.key || file.id,
            file,
          ])
        ).values()
      );
      const confirmedInsights = input.confirmedInsights.length > 0
        ? input.confirmedInsights
        : buildExtractedInsights({ contextInputs, sourceFiles, aspiration });
      const effectivePriorityCount = getConfiguredPriorityCount(effectiveOrganizationConfig, adminConfig);
      const effectiveLeadershipAreas = adminConfig.idp.leadershipAreas;
      const leadershipDimensionLabels = getLeadershipDimensionLabels(effectiveLeadershipAreas, language === "ar");
      const reportConfiguration = adminConfig.report;
      const enabledReportSections = Object.entries(reportConfiguration.enabledSections)
        .filter(([, enabled]) => enabled)
        .map(([section]) => section);
      const adminGenerationConfig = {
        organization: {
          id: matchedOrganization.id,
          name: matchedOrganization.organizationName,
          region: matchedOrganization.region,
          defaultLanguage: matchedOrganization.defaultLanguage,
        },
        participantProfile,
        idpWorkflow: {
          allowedApproaches: adminConfig.idp.allowedApproaches,
          enabledEvidenceSections: adminConfig.idp.enabledEvidenceSections,
          requiredFields: adminConfig.idp.requiredFields,
          leadershipAreas: effectiveLeadershipAreas,
          selectedLeadershipDimensions: leadershipDimensionLabels,
          defaultPriorityCount: adminConfig.idp.defaultPriorityCount,
          reviewPeriod: adminConfig.idp.reviewPeriod,
          managerReviewRequired: adminConfig.idp.managerReviewRequired,
        },
        evidenceControls: {
          allowedFileTypes: adminConfig.evidence.allowedFileTypes,
          maxFileSizeMb: adminConfig.evidence.maxFileSizeMb,
          developmentFramework: effectiveFramework,
          framework702010Mode: adminConfig.evidence.framework702010Mode,
          requiredEvidenceByProgram: adminConfig.evidence.requiredEvidenceByProgram,
          evidenceReviewStatus: adminConfig.evidence.evidenceReviewStatus,
        },
        reportParameters: {
          template: reportConfiguration.template,
          targetPageCount: reportConfiguration.targetPageCount,
          maxPriorityCount: effectivePriorityCount,
          enabledSections: enabledReportSections,
          sectionOrder: reportConfiguration.sectionOrder,
          showEvidenceConfidence: reportConfiguration.showEvidenceConfidence,
          showAiDisclosure: reportConfiguration.showAiDisclosure,
          customInstructions: reportConfiguration.customInstructions,
        },
        revisionParameters: adminConfig.revisions,
        programSetup: {
          programName: adminConfig.program.programName,
          objectives: adminConfig.program.objectives,
          moduleThemes: adminConfig.program.moduleThemes,
          competencies: adminConfig.program.competencies,
          documentSummaries: buildProgramDocumentSummary(adminConfig),
        },
        companyKnowledge: {
          useApprovedDocumentsOnly: adminConfig.companyKnowledge.useApprovedDocumentsOnly,
          requireSourceReferences: adminConfig.companyKnowledge.requireSourceReferences,
          flagEvidenceConflicts: adminConfig.companyKnowledge.flagEvidenceConflicts,
          documents: buildCompanyKnowledgeSummary(approvedCompanyDocuments),
        },
      };
      const enterpriseContext = buildEnterpriseContext({
        employeeDetails,
        idpMode,
        supportingSources: adminDrivenSupportingSources,
        developmentFramework: effectiveFramework,
        sourceFiles,
        contextInputs,
        confirmedInsights,
        organizationConfig: {
          organizationName: effectiveOrganizationConfig.organizationName || employeeDetails.company,
          organizationLogo: organizationLogo || effectiveOrganizationConfig.organizationLogo,
          brandColors: effectiveOrganizationConfig.brandColors,
          competencyFramework: effectiveOrganizationConfig.competencyFramework,
          leadershipFramework: effectiveOrganizationConfig.leadershipFramework,
          programObjectives: effectiveOrganizationConfig.programObjectives,
          roleArchitecture: effectiveOrganizationConfig.roleArchitecture,
          successProfiles: effectiveOrganizationConfig.successProfiles,
          approvedDevelopmentFramework: effectiveFramework,
          approvedLearningCatalog: effectiveOrganizationConfig.approvedLearningCatalog,
          idpOutputTemplate: effectiveOrganizationConfig.idpOutputTemplate,
          idpReportConfiguration: effectiveOrganizationConfig.idpReportConfiguration,
          revisionConfiguration: effectiveOrganizationConfig.revisionConfiguration,
        },
        aspiration,
        reviewPeriod: reviewPeriod || adminConfig.idp.reviewPeriod,
      });
      
      const isArabic = language === 'ar';
      const outputLanguageName = getOutputLanguageName(language);
      const leadershipDimensionInstruction = leadershipDimensionLabels.join(", ");
      const reportSectionInstruction = enabledReportSections.join(", ") || "standard IDP sections";
      
      // Build the prompt for the LLM
      const systemPrompt = isArabic ? `أنت مستشار تطوير قيادي متخصص في خطط التطوير الفردية للمؤسسات.
مهمتك هي تحويل الأدلة المؤكدة، وسياق البرنامج، ومتطلبات الدور، ومدخلات المدير، وتأملات المشارك إلى مسودة خطة تطوير فردية موجزة وقابلة للتعديل.

يجب ألا تكون الخطة تقريراً عاماً من الذكاء الاصطناعي. اربط كل توصية بدليل مذكور في السياق، وميز بين دليل من المستندات، وتأمل المشارك، ومدخلات المدير، واستنتاج الذكاء الاصطناعي. لا تخترع حقائق غير موجودة.

نظم الخطة فقط حول أبعاد القيادة التي فعّلها المسؤول: ${leadershipDimensionInstruction}.
لا تضف أبعاد قيادة غير مفعلة حتى لو كانت شائعة في قوالب خطط التطوير.

إعداد إطار التطوير: ${buildDevelopmentFrameworkInstruction(effectiveFramework)}
وضع 70-20-10 من المسؤول: ${adminConfig.evidence.framework702010Mode}. إذا كان مخفياً فلا تذكر 70-20-10. إذا كان مفعلاً فاستخدم تسميات تجريبي/اجتماعي/رسمي دون فرض نسب إلا إذا كانت مذكورة في إعدادات المؤسسة.

يجب احترام إعدادات التقرير من المسؤول. الأقسام المفعّلة هي: ${reportSectionInstruction}. التعليمات الخاصة: ${reportConfiguration.customInstructions || "لا توجد تعليمات إضافية"}.

قدم ${effectivePriorityCount} أولويات تطوير عالية الأثر فقط. لكل أولوية، وضح السلوك المتوقع، أثر الأعمال، الأدلة على النجاح، وتاريخ المراجعة.
تجنب العبارات العامة مثل "تحسين التواصل" أو "تطوير التفكير الاستراتيجي" ما لم تجعلها سلوكاً محدداً يمكن ملاحظته.
لا تقدم ادعاءات طبية أو نفسية أو تشخيصية عن تقارير القياس النفسي.
استخدم برنامج المؤسسة، وثائق المعرفة المعتمدة، تقارير التقييم، مدخلات الذات، ومدخلات المدير بحسب ما هو متاح ومفعّل. لا تجعل الموارد التعليمية أو المنهجية تطغى على الأولويات.

قدم أيضاً نقاط القوة، فرص النمو، نموذج GROW، والالتزامات الشخصية بصيغة المتكلم.

قدم إجابتك كـ JSON صالح بهذا الهيكل بالضبط (جميع النصوص يجب أن تكون بالعربية):
` : `You are an enterprise leadership-development consultant creating Individual Development Plans for participants in corporate programs.
Your task is to synthesize confirmed evidence, program context, role expectations, manager input, participant reflection, and organization context into a concise editable IDP draft.

This must not feel like a generic AI report. Ground every recommendation in the supplied evidence. Distinguish clearly between document evidence, participant reflection, manager input, and AI inference. Do not invent unsupported facts.

Write all user-facing JSON string values in ${outputLanguageName}.

Organize the plan only around the leadership dimensions enabled by Admin: ${leadershipDimensionInstruction}.
Do not add disabled leadership dimensions even if they appear in a generic IDP template.

Development framework setting: ${buildDevelopmentFrameworkInstruction(effectiveFramework)}
Admin 70-20-10 mode: ${adminConfig.evidence.framework702010Mode}. If hidden, do not mention 70-20-10. If enabled, use Experiential, Social, and Formal labels without forcing percentages unless the organization has configured them.

Respect Admin report configuration. Enabled report sections are: ${reportSectionInstruction}. Custom report instructions: ${reportConfiguration.customInstructions || "None"}.

Create exactly ${effectivePriorityCount} high-impact development priorit${effectivePriorityCount === 1 ? "y" : "ies"}. For each priority, show the behaviour change, business impact, evidence of success, and review date.
Avoid vague phrases such as "improve communication", "enhance leadership", or "develop strategic thinking" unless you convert them into specific observable behaviours.
Do not over-diagnose psychometric reports. Do not make clinical, psychological, or medical claims.
Use the configured program setup, approved company knowledge, assessment evidence, self inputs, and manager inputs where available. Keep learning recommendations practical, role-relevant, and secondary to the development priorities.

Also provide strengths, growth opportunities, a GROW coaching model, and first-person commitments.

Output your response as a valid JSON object with this exact structure:
{
  "objectives": [
    {
      "title": "Objective title",
      "description": "Detailed description of the objective",
      "measurable": "How success will be measured (specific KPIs or metrics)",
      "recommendations": {
        "experiential": ["recommendation 1", "recommendation 2", "recommendation 3"],
        "social": ["recommendation 1", "recommendation 2", "recommendation 3"],
        "formal": ["recommendation 1", "recommendation 2", "recommendation 3"]
      }
    }
  ],
  "strengths": [
    { "area": "Strength area name", "score": 85 }
  ],
  "gaps": [
    { "area": "Gap area name", "score": 70 }
  ],
  "growModel": {
    "goal": "Primary development goal statement",
    "reality": "Current state assessment",
    "options": ["option 1", "option 2", "option 3"],
    "willDo": ["action 1", "action 2", "action 3"]
  },
  "summaryAdvice": "A comprehensive paragraph providing collective advice based on all inputs and recommendations"
}

Generate exactly ${effectivePriorityCount} meaningful development priorit${effectivePriorityCount === 1 ? "y" : "ies"} with criticality assessment, 4-6 strengths, and 4-6 gaps based on confirmed evidence, role context, program context, manager input, and participant reflection.

For each objective, assess its criticality level (low, medium, high, critical) based on:
- How critical the skill gap is to the employee's current role
- Impact on career progression if not addressed
- Urgency of development need
- Alignment with organizational priorities`;

      // Build user message with all context
      let userMessage = `Please create an enterprise Individual Development Plan for the following participant:

Employee Name: ${employeeDetails.employeeName}
Position: ${employeeDetails.position || "Not specified"}
Company: ${employeeDetails.company}
Department: ${employeeDetails.department || "Not specified"}
Years of Experience: ${employeeDetails.yearsOfExperience || "Not specified"}
Date of Joining: ${employeeDetails.dateOfJoining ? new Date(employeeDetails.dateOfJoining).toLocaleDateString() : "Not specified"}
Direct Manager: ${employeeDetails.directManager || "Not specified"}
Preferred Output Language: ${outputLanguageName}
Selected IDP Mode: ${idpMode}
Admin-enabled Supporting Sources: ${adminDrivenSupportingSources.join(", ") || "None selected"}
Approved Company Knowledge Documents: ${companySourceFiles.length}
Program Setup Documents: ${programSourceFiles.length}
Development Framework: ${effectiveFramework}
Report Template: ${effectiveOrganizationConfig.idpOutputTemplate || effectiveOrganizationConfig.idpReportConfiguration?.template || "standard"}
Report Priority Count: ${effectivePriorityCount}
Aspiration / Next Role Goal: ${aspiration || contextInputs.participant.careerAspiration || "Not specified"}
IDP Review Period: ${reviewPeriod || adminConfig.idp.reviewPeriod || "90 days"}
`;

      userMessage += `\n\nAdmin configuration that must drive the report logic:\n${JSON.stringify(adminGenerationConfig, null, 2)}`;

      userMessage += `\n\nStructured enterprise context object:\n${JSON.stringify(enterpriseContext, null, 2)}`;

      if (sourceFiles.length > 0) {
        userMessage += `\n\nAvailable categorized source document(s): ${sourceFiles.map(f => `${f.name} (${sourceLabels[f.sourceType]})`).join(", ")}`;
        const documentEvidence = sourceFiles
          .filter((file) => file.extractedText || file.extractedSummary)
          .map((file) => {
            const text = (file.extractedText || file.extractedSummary || "").slice(0, 2200);
            return `- ${file.name} [${sourceLabels[file.sourceType]}]: ${text}`;
          })
          .join("\n");
        if (documentEvidence) {
          userMessage += `\n\nExtracted document evidence that must be considered:\n${documentEvidence}`;
        }
      }

      if (manualInput && manualInput.trim()) {
        userMessage += `\n\nAdditional reflection input from the participant:\n${manualInput}`;
      }

      userMessage += `\n\nBased on this confirmed information, generate a concise IDP with:
1. Exactly ${effectivePriorityCount} high-impact leadership priorit${effectivePriorityCount === 1 ? "y" : "ies"}, each with:
   - A criticality level (low/medium/high/critical) based on urgency and impact
   - Specific recommended actions mapped to the selected development framework
   - Evidence of success and expected business impact
   - Alignment to one of these Admin-enabled leadership dimensions only: ${leadershipDimensionInstruction}
2. Key strengths analysis (4-6 areas with scores)
3. Key growth opportunities (4-6 areas with scores)
4. First-person commitments, a 30-60-90 day plan, and a manager discussion guide

The report must respect these Admin report sections: ${reportSectionInstruction}.
Use the configured review period: ${reviewPeriod || adminConfig.idp.reviewPeriod || "90 days"}.
Write the user-facing plan in ${outputLanguageName}.`;

      // Build messages array with file content if available
      const messages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      // Add file content for PDFs
      const userContent: any[] = [{ type: "text", text: userMessage }];
      
      for (const file of sourceFiles) {
        if (file.url && (file.name.toLowerCase().endsWith('.pdf'))) {
          userContent.push({
            type: "file_url",
            file_url: {
              url: file.url,
              mime_type: "application/pdf"
            }
          });
        }
      }

      messages.push({ role: "user", content: userContent });

      let idpData: any;
      let usedLocalGenerator = false;

      if (ENV.forgeApiKey) {
        try {
          const response = await invokeLLM({
            messages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "idp_response",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    objectives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          measurable: { type: "string" },
                          criticality: { type: "string", enum: ["low", "medium", "high", "critical"] },
                          recommendations: {
                            type: "object",
                            properties: {
                              experiential: { type: "array", items: { type: "string" } },
                              social: { type: "array", items: { type: "string" } },
                              formal: { type: "array", items: { type: "string" } },
                            },
                            required: ["experiential", "social", "formal"],
                            additionalProperties: false,
                          },
                        },
                        required: ["title", "description", "measurable", "criticality", "recommendations"],
                        additionalProperties: false,
                      },
                    },
                    strengths: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          area: { type: "string" },
                          score: { type: "number" },
                        },
                        required: ["area", "score"],
                        additionalProperties: false,
                      },
                    },
                    gaps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          area: { type: "string" },
                          score: { type: "number" },
                        },
                        required: ["area", "score"],
                        additionalProperties: false,
                      },
                    },
                    growModel: {
                      type: "object",
                      properties: {
                        goal: { type: "string" },
                        reality: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        willDo: { type: "array", items: { type: "string" } },
                      },
                      required: ["goal", "reality", "options", "willDo"],
                      additionalProperties: false,
                    },
                    summaryAdvice: { type: "string" },
                  },
                  required: ["objectives", "strengths", "gaps", "growModel", "summaryAdvice"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("Failed to generate IDP: No content in response");
          }

          idpData = JSON.parse(content);
        } catch (error) {
          console.warn("[IDP] AI generation failed, using local generator:", error);
          idpData = buildLocalIdpData(employeeDetails, manualInput, language);
          usedLocalGenerator = true;
        }
      } else {
        idpData = buildLocalIdpData(employeeDetails, manualInput, language);
        usedLocalGenerator = true;
      }

      if (usedLocalGenerator) {
        idpData = applyEvidenceGroundingToLocalData({
          idpData,
          enterpriseContext,
          priorityCount: effectivePriorityCount,
          language,
        });
      }
      idpData = addLeadershipReflectionFields(idpData, employeeDetails, manualInput, language, enterpriseContext, {
        leadershipAreas: effectiveLeadershipAreas,
        priorityCount: effectivePriorityCount,
        reviewPeriod: reviewPeriod || adminConfig.idp.reviewPeriod,
      });
      idpData.objectives = Array.isArray(idpData.objectives)
        ? idpData.objectives.slice(0, effectivePriorityCount)
        : [];
      const publicationState = resolveGeneratedIdpPublicationState({
        organization: matchedOrganization,
        adminConfig,
        managerName: employeeDetails.directManager,
      });
      idpData.enterpriseMetadata = {
        ...(idpData.enterpriseMetadata || {}),
        publication: publicationState.metadata,
        managerReviewStatus: publicationState.managerReview.status,
      };

      // Save to database
      const db = await getDb();

      // Add default status and progress to objectives
      const objectivesWithProgress = idpData.objectives.map((obj: any) => ({
        ...obj,
        status: obj.status || ("not_started" as const),
        progress: obj.progress || 0,
        latestReflection: obj.latestReflection || "",
        evidenceUploaded: obj.evidenceUploaded || [],
        managerFeedback: obj.managerFeedback || "",
        reviewDate: obj.reviewDate || obj.targetReviewDate,
        nextAction: obj.nextAction || obj.recommendedActions?.[0] || "",
        checkIns: obj.checkIns || [],
      }));

      let insertedId: number;
      if (db) {
        try {
          const insertResult = await db.insert(idpRecords).values({
            userId: 1, // Default user ID for now, will be replaced with ctx.user.id when auth is required
            employeeName: employeeDetails.employeeName,
            position: employeeDetails.position || null,
            company: employeeDetails.company,
            department: employeeDetails.department || "",
            yearsOfExperience: employeeDetails.yearsOfExperience || 0,
            dateOfJoining: employeeDetails.dateOfJoining,
            dateOfIdpCreation: employeeDetails.dateOfIdpCreation,
            directManager: employeeDetails.directManager || "",
            uploadedFiles: uploadedFiles,
            manualInput: manualInput || null,
            organizationLogo: organizationLogo || null,
            idpMode,
            supportingSources: adminDrivenSupportingSources,
            sourceFiles,
            contextInputs,
            extractedInsights,
            confirmedInsights,
            developmentFramework: effectiveFramework,
            organizationConfig: enterpriseContext.organizationContext,
            aspiration: aspiration || contextInputs.participant.careerAspiration || null,
            reviewPeriod: reviewPeriod || adminConfig.idp.reviewPeriod || null,
            objectives: objectivesWithProgress,
            strengths: idpData.strengths,
            gaps: idpData.gaps,
            growModel: idpData.growModel,
            learningResources: null,
            leadershipSummary: idpData.leadershipSummary,
            commitments: idpData.commitments,
            actionPlan: idpData.actionPlan,
            managerGuide: idpData.managerGuide,
            enterpriseMetadata: idpData.enterpriseMetadata,
            managerReview: publicationState.managerReview,
            checkIns: [],
            summaryAdvice: idpData.summaryAdvice,
            status: publicationState.status,
          });

          insertedId = insertResult[0].insertId;
        } catch (error) {
          console.warn("[IDP] Database save failed, using local memory store:", error);
          insertedId = saveLocalIdpRecord({
            employeeDetails,
            uploadedFiles,
            manualInput,
            organizationLogo,
            idpData,
            idpMode,
            supportingSources: adminDrivenSupportingSources,
            sourceFiles,
            contextInputs,
            extractedInsights,
            confirmedInsights,
            developmentFramework: effectiveFramework,
            organizationConfig: enterpriseContext.organizationContext,
            aspiration,
            reviewPeriod: reviewPeriod || adminConfig.idp.reviewPeriod,
            recordStatus: publicationState.status,
            managerReview: publicationState.managerReview,
          }).id;
        }
      } else {
        insertedId = saveLocalIdpRecord({
          employeeDetails,
          uploadedFiles,
          manualInput,
          organizationLogo,
          idpData,
          idpMode,
          supportingSources: adminDrivenSupportingSources,
          sourceFiles,
          contextInputs,
          extractedInsights,
          confirmedInsights,
          developmentFramework: effectiveFramework,
          organizationConfig: enterpriseContext.organizationContext,
          aspiration,
          reviewPeriod: reviewPeriod || adminConfig.idp.reviewPeriod,
          recordStatus: publicationState.status,
          managerReview: publicationState.managerReview,
        }).id;
      }

      return {
        id: insertedId,
        objectives: objectivesWithProgress,
        strengths: idpData.strengths,
        gaps: idpData.gaps,
        leadershipSummary: idpData.leadershipSummary,
        commitments: idpData.commitments,
        actionPlan: idpData.actionPlan,
        managerGuide: idpData.managerGuide,
        enterpriseMetadata: idpData.enterpriseMetadata,
        idpMode,
        supportingSources: adminDrivenSupportingSources,
        sourceFiles,
        contextInputs,
        extractedInsights,
        confirmedInsights,
        developmentFramework: effectiveFramework,
        organizationConfig: enterpriseContext.organizationContext,
        managerReview: publicationState.managerReview,
        summaryAdvice: idpData.summaryAdvice,
      };
    }),

  // Get IDP by ID
  getIdp: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const existingLocalRecord = getLocalIdpRecord(input.id);
      if (existingLocalRecord) {
        return existingLocalRecord;
      }

      const db = await getDb();
      if (!db) {
        throw new Error("IDP not found");
      }

      const result = await db
        .select()
        .from(idpRecords)
        .where(eq(idpRecords.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("IDP not found");
      }

      return result[0];
    }),

  // List all IDPs
  listIdps: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return Array.from(localIdpRecords.values()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      }

      const result = await db
        .select()
        .from(idpRecords)
        .orderBy(desc(idpRecords.createdAt));

      return result;
    }),

  // Update objective status and progress
  updateObjectiveStatus: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        objectiveIndex: z.number(),
        status: z.enum(objectiveProgressStatuses),
        progress: z.number().min(0).max(100),
        deadline: z.string().optional(),
        latestReflection: z.string().optional(),
        evidenceUploaded: z.array(z.object({
          name: z.string(),
          key: z.string().optional(),
          url: z.string().optional(),
          uploadedAt: z.string().optional(),
        })).optional(),
        managerFeedback: z.string().optional(),
        reviewDate: z.string().optional(),
        nextAction: z.string().optional(),
        checkIn: checkInSchema.omit({ id: true, createdAt: true, objectiveIndex: true }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const objectives = (existingLocalRecord.objectives as any[]) || [];
        if (input.objectiveIndex < 0 || input.objectiveIndex >= objectives.length) {
          throw new Error("Invalid objective index");
        }
        objectives[input.objectiveIndex] = {
          ...objectives[input.objectiveIndex],
          status: input.status,
          progress: input.progress,
          ...(input.deadline !== undefined && { deadline: input.deadline }),
          ...(input.latestReflection !== undefined && { latestReflection: input.latestReflection }),
          ...(input.evidenceUploaded !== undefined && { evidenceUploaded: input.evidenceUploaded }),
          ...(input.managerFeedback !== undefined && { managerFeedback: input.managerFeedback }),
          ...(input.reviewDate !== undefined && { reviewDate: input.reviewDate }),
          ...(input.nextAction !== undefined && { nextAction: input.nextAction }),
        };
        if (input.checkIn) {
          const checkIn: PriorityCheckIn = {
            id: nanoid(),
            objectiveIndex: input.objectiveIndex,
            createdAt: new Date().toISOString(),
            ...input.checkIn,
          };
          objectives[input.objectiveIndex].checkIns = [
            ...((objectives[input.objectiveIndex].checkIns as PriorityCheckIn[]) || []),
            checkIn,
          ];
          existingLocalRecord.checkIns = [...(existingLocalRecord.checkIns || []), checkIn];
        }
        existingLocalRecord.objectives = objectives;
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, objectives };
      }

      const db = await getDb();
      if (!db) {
        throw new Error("IDP not found");
      }

      // Get the current IDP
      const result = await db
        .select()
        .from(idpRecords)
        .where(eq(idpRecords.id, input.idpId))
        .limit(1);

      if (result.length === 0) {
        throw new Error("IDP not found");
      }

      const idp = result[0];
      const objectives = (idp.objectives as any[]) || [];

      if (input.objectiveIndex < 0 || input.objectiveIndex >= objectives.length) {
        throw new Error("Invalid objective index");
      }

      // Update the specific objective
      objectives[input.objectiveIndex] = {
        ...objectives[input.objectiveIndex],
        status: input.status,
        progress: input.progress,
        ...(input.deadline !== undefined && { deadline: input.deadline }),
        ...(input.latestReflection !== undefined && { latestReflection: input.latestReflection }),
        ...(input.evidenceUploaded !== undefined && { evidenceUploaded: input.evidenceUploaded }),
        ...(input.managerFeedback !== undefined && { managerFeedback: input.managerFeedback }),
        ...(input.reviewDate !== undefined && { reviewDate: input.reviewDate }),
        ...(input.nextAction !== undefined && { nextAction: input.nextAction }),
      };

      const updateData: any = { objectives };
      if (input.checkIn) {
        const checkIn: PriorityCheckIn = {
          id: nanoid(),
          objectiveIndex: input.objectiveIndex,
          createdAt: new Date().toISOString(),
          ...input.checkIn,
        };
        objectives[input.objectiveIndex].checkIns = [
          ...((objectives[input.objectiveIndex].checkIns as PriorityCheckIn[]) || []),
          checkIn,
        ];
        updateData.objectives = objectives;
        updateData.checkIns = [...(((idp as any).checkIns as PriorityCheckIn[]) || []), checkIn];
      }

      // Update the database
      await db
        .update(idpRecords)
        .set(updateData)
        .where(eq(idpRecords.id, input.idpId));

      return { success: true, objectives };
    }),

  submitForManagerReview: publicProcedure
    .input(z.object({ idpId: z.number() }))
    .mutation(async ({ input }) => {
      const submittedAt = new Date().toISOString();
      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const currentReview = (existingLocalRecord.managerReview || createDefaultManagerReview(existingLocalRecord.directManager)) as ManagerReview;
        const managerReview: ManagerReview = {
          ...currentReview,
          status: "submitted",
          submittedAt,
          managerName: currentReview.managerName || existingLocalRecord.directManager || "",
        };
        existingLocalRecord.managerReview = managerReview;
        existingLocalRecord.status = "in_review";
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, managerReview };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");
      const idp = result[0] as any;
      const currentReview = (idp.managerReview || createDefaultManagerReview(idp.directManager)) as ManagerReview;
      const managerReview: ManagerReview = {
        ...currentReview,
        status: "submitted",
        submittedAt,
        managerName: currentReview.managerName || idp.directManager || "",
      };
      await db.update(idpRecords).set({ managerReview, status: "in_review" }).where(eq(idpRecords.id, input.idpId));
      return { success: true, managerReview };
    }),

  addManagerReviewInput: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        objectiveIndex: z.number(),
        comment: z.string().optional(),
        suggestedEdit: z.object({
          field: z.string(),
          currentValue: z.string(),
          suggestedValue: z.string(),
          rationale: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const applyReviewInput = (record: any) => {
        const managerReview = (record.managerReview || createDefaultManagerReview(record.directManager)) as ManagerReview;
        const nextReview: ManagerReview = {
          ...managerReview,
          status: managerReview.status === "not_submitted" ? "submitted" : managerReview.status,
          comments: [...(managerReview.comments || [])],
          suggestedEdits: [...(managerReview.suggestedEdits || [])],
        };

        if (input.comment?.trim()) {
          nextReview.comments.push({
            id: nanoid(),
            objectiveIndex: input.objectiveIndex,
            comment: input.comment.trim(),
            createdAt: new Date().toISOString(),
          });
        }

        if (input.suggestedEdit) {
          nextReview.status = "changes_requested";
          nextReview.suggestedEdits.push({
            id: nanoid(),
            objectiveIndex: input.objectiveIndex,
            field: input.suggestedEdit.field,
            currentValue: input.suggestedEdit.currentValue,
            suggestedValue: input.suggestedEdit.suggestedValue,
            rationale: input.suggestedEdit.rationale,
            status: "pending",
          });
        }

        return nextReview;
      };

      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const managerReview = applyReviewInput(existingLocalRecord);
        existingLocalRecord.managerReview = managerReview;
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, managerReview };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");
      const managerReview = applyReviewInput(result[0]);
      await db.update(idpRecords).set({ managerReview }).where(eq(idpRecords.id, input.idpId));
      return { success: true, managerReview };
    }),

  resolveManagerEdit: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        editId: z.string(),
        status: z.enum(["accepted", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      const resolveReview = (record: any) => {
        const managerReview = (record.managerReview || createDefaultManagerReview(record.directManager)) as ManagerReview;
        return {
          ...managerReview,
          suggestedEdits: (managerReview.suggestedEdits || []).map((edit) =>
            edit.id === input.editId ? { ...edit, status: input.status } : edit
          ),
        } satisfies ManagerReview;
      };

      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const managerReview = resolveReview(existingLocalRecord);
        existingLocalRecord.managerReview = managerReview;
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, managerReview };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");
      const managerReview = resolveReview(result[0]);
      await db.update(idpRecords).set({ managerReview }).where(eq(idpRecords.id, input.idpId));
      return { success: true, managerReview };
    }),

  markManagerReviewed: publicProcedure
    .input(z.object({ idpId: z.number(), managerSummaryComment: z.string().optional() }))
    .mutation(async ({ input }) => {
      const reviewedAt = new Date().toISOString();
      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const currentReview = (existingLocalRecord.managerReview || createDefaultManagerReview(existingLocalRecord.directManager)) as ManagerReview;
        const managerReview: ManagerReview = {
          ...currentReview,
          status: "reviewed",
          reviewedAt,
          managerSummaryComment: input.managerSummaryComment ?? currentReview.managerSummaryComment,
        };
        existingLocalRecord.managerReview = managerReview;
        existingLocalRecord.status = "finalized";
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, managerReview };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");
      const idp = result[0] as any;
      const currentReview = (idp.managerReview || createDefaultManagerReview(idp.directManager)) as ManagerReview;
      const managerReview: ManagerReview = {
        ...currentReview,
        status: "reviewed",
        reviewedAt,
        managerSummaryComment: input.managerSummaryComment ?? currentReview.managerSummaryComment,
      };
      await db.update(idpRecords).set({ managerReview, status: "finalized" }).where(eq(idpRecords.id, input.idpId));
      return { success: true, managerReview };
    }),

  agreeReviewDates: publicProcedure
    .input(z.object({ idpId: z.number(), reviewDates: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const currentReview = (existingLocalRecord.managerReview || createDefaultManagerReview(existingLocalRecord.directManager)) as ManagerReview;
        const managerReview: ManagerReview = {
          ...currentReview,
          agreedReviewDates: input.reviewDates,
        };
        existingLocalRecord.managerReview = managerReview;
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, managerReview };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");
      const idp = result[0] as any;
      const currentReview = (idp.managerReview || createDefaultManagerReview(idp.directManager)) as ManagerReview;
      const managerReview: ManagerReview = {
        ...currentReview,
        agreedReviewDates: input.reviewDates,
      };
      await db.update(idpRecords).set({ managerReview }).where(eq(idpRecords.id, input.idpId));
      return { success: true, managerReview };
    }),

  // Get coaching advice based on IDP progress
  getCoachingAdvice: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        objectives: z.array(z.any()),
        userMessage: z.string(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { objectives, userMessage, conversationHistory } = input;

      // Calculate progress statistics
      const totalObjectives = objectives.length;
      const completedObjectives = objectives.filter((obj: any) => obj.status === "completed").length;
      const inProgressObjectives = objectives.filter((obj: any) => obj.status === "in_progress").length;
      const avgProgress = objectives.reduce((sum: number, obj: any) => sum + (obj.progress || 0), 0) / totalObjectives;

      const systemPrompt = `You are an experienced career development coach and mentor. You're helping an employee work through their Individual Development Plan (IDP).

Current IDP Status:
- Total Objectives: ${totalObjectives}
- Completed: ${completedObjectives}
- In Progress: ${inProgressObjectives}
- Average Progress: ${Math.round(avgProgress)}%

Objectives:
${objectives.map((obj: any, i: number) => `${i + 1}. ${obj.title} (${obj.status}, ${obj.progress}% complete)`).join("\n")}

Your role:
- Provide personalized, actionable coaching advice
- Help overcome obstacles and challenges
- Suggest specific strategies for achieving objectives
- Encourage and motivate based on progress
- Offer accountability and next steps
- Be empathetic, supportive, and professional

Keep responses concise (under 200 words) but meaningful.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
        { role: "user", content: userMessage },
      ];

      const response = await invokeLLM({ messages });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        return { advice: "I apologize, but I'm having trouble responding right now. Please try again." };
      }

      return { advice: content };
    }),

  // Get learning resource recommendations
  getLearningResources: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        objectives: z.array(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const { idpId, objectives } = input;

      const systemPrompt = `You are an enterprise learning and development advisor. Based on the participant's IDP priorities, recommend a small, relevant set of learning resources.

For each objective, provide:
1. **Online Courses** (internal catalog first if supplied by the organization; otherwise reputable external options)
2. **Books** (specific titles with authors)
3. **Certifications** only when they are genuinely relevant to the participant's role level and priority
4. **Workshops/Conferences** (relevant events or programs)

Do not recommend irrelevant certifications to senior leaders. Do not repeat the same generic resources for every priority. Keep the recommendations concise and editable.

Output as JSON with this structure:
{
  "resources": [
    {
      "objectiveTitle": "Objective title",
      "courses": [
        { "title": "Course name", "platform": "Coursera", "url": "https://...", "description": "Brief description" }
      ],
      "books": [
        { "title": "Book title", "author": "Author name", "description": "Why this book is relevant" }
      ],
      "certifications": [
        { "title": "Certification name", "provider": "Provider", "description": "What it covers" }
      ],
      "workshops": [
        { "title": "Workshop/Conference name", "description": "What to expect" }
      ]
    }
  ]
}`;

      const userMessage = `Generate learning resource recommendations for these IDP objectives:\n\n${objectives.map((obj: any, i: number) => `${i + 1}. ${obj.title}\n   Description: ${obj.description}`).join("\n\n")}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "learning_resources",
            strict: true,
            schema: {
              type: "object",
              properties: {
                resources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      objectiveTitle: { type: "string" },
                      courses: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            platform: { type: "string" },
                            url: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "platform", "url", "description"],
                          additionalProperties: false,
                        },
                      },
                      books: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            author: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "author", "description"],
                          additionalProperties: false,
                        },
                      },
                      certifications: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            provider: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "provider", "description"],
                          additionalProperties: false,
                        },
                      },
                      workshops: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "description"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["objectiveTitle", "courses", "books", "certifications", "workshops"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["resources"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Failed to generate learning resources");
      }

      const resourcesData = JSON.parse(content);

      // Save to database
      const db = await getDb();
      if (db) {
        await db
          .update(idpRecords)
          .set({ learningResources: resourcesData.resources })
          .where(eq(idpRecords.id, idpId));
      }

      return resourcesData;
    }),

  updateLearningResources: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        resources: z.array(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        existingLocalRecord.learningResources = input.resources;
        existingLocalRecord.updatedAt = new Date();
        setLocalIdpRecord(input.idpId, existingLocalRecord);
        return { success: true, resources: input.resources };
      }

      const db = await getDb();
      if (db) {
        await db
          .update(idpRecords)
          .set({ learningResources: input.resources })
          .where(eq(idpRecords.id, input.idpId));
      }

      return { success: true, resources: input.resources };
    }),

  finalizeIdp: publicProcedure
    .input(z.object({ idpId: z.number() }))
    .mutation(async ({ input }) => {
      const publishedAt = new Date().toISOString();
      const finalizeRecord = (record: any) => ({
        ...record,
        status: "finalized" as const,
        enterpriseMetadata: {
          ...(record.enterpriseMetadata || {}),
          publication: {
            ...((record.enterpriseMetadata || {}).publication || {}),
            appliedStatus: "published",
            publishedAt,
          },
        },
        updatedAt: new Date(),
      });

      const existingLocalRecord = getLocalIdpRecord(input.idpId);
      if (existingLocalRecord) {
        const finalized = finalizeRecord(existingLocalRecord);
        setLocalIdpRecord(input.idpId, finalized);
        return {
          success: true,
          status: finalized.status,
          publication: finalized.enterpriseMetadata?.publication,
        };
      }

      const db = await getDb();
      if (!db) throw new Error("IDP not found");
      const result = await db.select().from(idpRecords).where(eq(idpRecords.id, input.idpId)).limit(1);
      if (result.length === 0) throw new Error("IDP not found");

      const finalized = finalizeRecord(result[0]);
      await db
        .update(idpRecords)
        .set({
          status: "finalized",
          enterpriseMetadata: finalized.enterpriseMetadata,
        })
        .where(eq(idpRecords.id, input.idpId));

      return {
        success: true,
        status: finalized.status,
        publication: finalized.enterpriseMetadata?.publication,
      };
    }),

  // Send IDP via email
  sendIdpEmail: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { idpId, recipientEmail, recipientName, message } = input;

      // Get the IDP
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const result = await db
        .select()
        .from(idpRecords)
        .where(eq(idpRecords.id, idpId))
        .limit(1);

      if (result.length === 0) {
        throw new Error("IDP not found");
      }

      const idp = result[0];
      const objectives = (idp.objectives as any[]) || [];

      // Build email content
      const emailSubject = `Individual Development Plan - ${idp.employeeName}`;
      const emailBody = `
Dear ${recipientName || "Recipient"},

${message || "Please find the Individual Development Plan attached below."}

---

**INDIVIDUAL DEVELOPMENT PLAN**

**Employee Information:**
- Name: ${idp.employeeName}
- Position: ${idp.position || "N/A"}
- Company: ${idp.company}
- Department: ${idp.department}
- Years of Experience: ${idp.yearsOfExperience}
- Direct Manager: ${idp.directManager}
- IDP Creation Date: ${new Date(idp.dateOfIdpCreation).toLocaleDateString()}

**Development Objectives:**

${objectives.map((obj: any, i: number) => `
${i + 1}. **${obj.title}**
   Status: ${obj.status === "completed" ? "✓ Completed" : obj.status === "in_progress" ? "⏳ In Progress" : "○ Not Started"} (${obj.progress}% complete)
   Dimension: ${obj.dimension || "Leadership Priority"}
   
   Description: ${obj.description}
   
   Evidence of Success: ${obj.evidenceOfSuccess || obj.measurable}
   
   **Recommended Actions:**
   ${(obj.recommendedActions || [
     ...(obj.recommendations?.experiential || []),
     ...(obj.recommendations?.social || []),
     ...(obj.recommendations?.formal || []),
   ].slice(0, 3)).map((rec: string) => `   • ${rec}`).join("\n   ")}
`).join("\n")}

**Summary Advice:**
${idp.summaryAdvice}

---

This IDP was created through the Emeritus Leadership Reflection Platform.
© ${new Date().getFullYear()} Emeritus - Learn. From the world's best.

To view the full interactive IDP with progress tracking, please visit: [IDP Link]
      `;

      void emailSubject;
      void emailBody;
      // TODO: Integrate with an approved email service without logging sensitive IDP content.
      return {
        success: true,
        message: `IDP sent to ${recipientEmail}`,
      };
    }),

  // Save signature
  saveSignature: publicProcedure
    .input(
      z.object({
        idpId: z.number(),
        signatureType: z.enum(["employee", "manager"]),
        signatureData: z.string(),  // Base64 encoded image
      })
    )
    .mutation(async ({ input }) => {
      const { idpId, signatureType, signatureData } = input;
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const updateData: any = {};
      if (signatureType === "employee") {
        updateData.employeeSignature = signatureData;
        updateData.employeeSignedAt = new Date();
      } else {
        updateData.managerSignature = signatureData;
        updateData.managerSignedAt = new Date();
      }

      await db.update(idpRecords)
        .set(updateData)
        .where(eq(idpRecords.id, idpId));

      return {
        success: true,
        message: `${signatureType === "employee" ? "Employee" : "Manager"} signature saved successfully`,
      };
    }),

  // Help chatbot
  chat: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      const systemPrompt = `You are a helpful assistant for the Emeritus Leadership Reflection Platform. Your role is to help users understand:
1. What an Individual Development Plan (IDP) is
2. How to reflect on programme learning before generating a plan
3. How to choose three leadership priorities across Leading Self, Leading Team, and Leading Business
4. How to write first-person commitments and 30-60-90 actions
5. How to prepare for a manager discussion

Be concise, friendly, and helpful. Keep responses under 150 words unless more detail is specifically requested.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.message },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        return { response: "I apologize, but I'm having trouble responding right now. Please try again." };
      }

      return { response: content };
    }),
});

// Admin Router
const adminRouter = router({
  getEnterpriseConfig: adminProcedure.query(async () => {
    return getAdminConfiguration();
  }),

  saveEnterpriseConfig: adminProcedure
    .input(adminConfigurationSchema)
    .mutation(async ({ input, ctx }) => {
      return saveAdminConfiguration(input, ctx.user.id);
    }),

  // List all users with their IDP stats
  listUsers: adminProcedure.query(async () => {
    const [allUsers, idpStats] = await Promise.all([
      getAllUsers(),
      getUserIdpStats(),
    ]);
    const statsMap = new Map(idpStats.map((s) => [s.userId, s]));
    return allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      loginMethod: u.loginMethod,
      organizationId: u.organizationId,
      organizationName: u.organizationName,
      participantId: u.participantId,
      createdAt: u.createdAt,
      lastSignedIn: u.lastSignedIn,
      idpCount: statsMap.get(u.id)?.idpCount ?? 0,
      lastIdpGenerated: statsMap.get(u.id)?.lastGenerated ?? null,
    }));
  }),

  // Update a user's role
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['user', 'admin']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Prevent admin from demoting themselves
      if (input.userId === ctx.user.id && input.role === 'user') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot demote yourself.' });
      }
      // Get current user's role before changing
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      const targetUsers = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const targetUser = targetUsers[0];
      if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      const oldRole = targetUser.role;
      await updateUserRole(input.userId, input.role);
      // Log the role change
      await insertRoleAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? 'Unknown',
        targetUserId: input.userId,
        targetUserName: targetUser.name ?? 'Unknown',
        oldRole,
        newRole: input.role,
      });
      return { success: true };
    }),

  // Get role change audit log
  getAuditLog: adminProcedure.query(async () => {
    return getRoleAuditLog(200);
  }),

  // Delete a single IDP (admin only)
  deleteIdp: adminProcedure
    .input(z.object({ idpId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteIdpById(input.idpId);
      return { success: true };
    }),

  // Bulk delete IDPs (admin only)
  deleteMultipleIdps: adminProcedure
    .input(z.object({ idpIds: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      await deleteIdpsByIds(input.idpIds);
      return { success: true, deleted: input.idpIds.length };
    }),

  // Edit IDP employee details (admin only)
  editIdp: adminProcedure
    .input(z.object({
      idpId: z.number(),
      employeeName: z.string().min(1),
      position: z.string().optional(),
      company: z.string().min(1),
      department: z.string().min(1),
      yearsOfExperience: z.number().min(0),
      directManager: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      await db.update(idpRecords)
        .set({
          employeeName: input.employeeName,
          position: input.position,
          company: input.company,
          department: input.department,
          yearsOfExperience: input.yearsOfExperience,
          directManager: input.directManager,
        })
        .where(eq(idpRecords.id, input.idpId));
      return { success: true };
    }),

  // List all IDPs for admin dashboard (with status filter support)
  listAllIdps: adminProcedure
    .input(z.object({
      statusFilter: z.enum(['all', 'not_started', 'in_progress', 'completed']).optional().default('all'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const records = await db.select({
        id: idpRecords.id,
        userId: idpRecords.userId,
        employeeName: idpRecords.employeeName,
        position: idpRecords.position,
        company: idpRecords.company,
        department: idpRecords.department,
        yearsOfExperience: idpRecords.yearsOfExperience,
        directManager: idpRecords.directManager,
        objectives: idpRecords.objectives,
        status: idpRecords.status,
        createdAt: idpRecords.createdAt,
        updatedAt: idpRecords.updatedAt,
      }).from(idpRecords).orderBy(desc(idpRecords.createdAt));

      return records.map((r) => {
        const objectives = (r.objectives as any[]) ?? [];
        const total = objectives.length;
        const completed = objectives.filter((o: any) => o.status === 'completed').length;
        const inProgress = objectives.filter((o: any) => o.status === 'in_progress').length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        let overallStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (completed === total && total > 0) overallStatus = 'completed';
        else if (inProgress > 0 || completed > 0) overallStatus = 'in_progress';
        return {
          id: r.id,
          userId: r.userId,
          employeeName: r.employeeName,
          position: r.position,
          company: r.company,
          department: r.department,
          yearsOfExperience: r.yearsOfExperience,
          directManager: r.directManager,
          status: r.status,
          objectivesCount: total,
          completionPct,
          overallStatus,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }).filter((r) => input.statusFilter === 'all' || r.overallStatus === input.statusFilter);
    }),

  // Get summary stats for admin dashboard
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalUsers: 0, totalIdps: 0, adminCount: 0 };
    const [allUsers, idpStats] = await Promise.all([
      getAllUsers(),
      getUserIdpStats(),
    ]);
    const totalIdps = idpStats.reduce((sum, s) => sum + Number(s.idpCount), 0);
    const adminCount = allUsers.filter((u) => u.role === 'admin').length;
    return { totalUsers: allUsers.length, totalIdps, adminCount };
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await loginWithCredentials(input.email, input.password);

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "IDP User",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user,
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  idp: idpRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
