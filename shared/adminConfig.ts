import {
  type DevelopmentFramework,
  developmentFrameworks,
  type IdpMode,
  type SupportingSourceType,
} from "./idpEnterprise";

export type ParticipantStatus = "invited" | "active" | "inactive";
export type Framework702010Mode = "hidden" | "optional" | "enabled";
export type EvidenceReviewStatus = "not_configured" | "draft" | "review_required" | "ready";
export type ProgramDocumentType = "program_brochure" | "ppt_deck" | "objectives_document" | "other";
export type ProgramDocumentReviewStatus = "needs_review" | "verified";
export type CompanyDocumentCategory =
  | "strategy_business_priorities"
  | "leadership_competency_framework"
  | "culture_values"
  | "organization_structure"
  | "role_job_description"
  | "role_career_architecture"
  | "success_profile"
  | "digital_ai_sustainability"
  | "policy_other";
export type CompanyDocumentReviewStatus =
  | "needs_review"
  | "approved"
  | "superseded"
  | "expired";
export type CompanyDocumentConfidentiality = "public" | "internal" | "confidential" | "restricted";
export type CompanyDocumentSourceClassification =
  | "internal_official"
  | "official_public"
  | "industry_benchmark"
  | "role_source";
export type IdpReportTemplate = "standard" | "executive" | "manager_review" | "custom";
export type RevisionCadence = "on_demand" | "monthly" | "quarterly" | "program_milestone";
export type IdpPublishingMode = "manual_finalize" | "publish_on_generation" | "manager_review_then_publish";

export type AdminParticipant = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  generatedPassword?: string;
  role: string;
  department: string;
  managerName: string;
  status: ParticipantStatus;
  addedAt: string;
};

export type AdminManagedFile = {
  id: string;
  name: string;
  url?: string;
  key?: string;
  hash?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: "ready" | "pending_review" | "removed";
};

export type AdminCompanyDocument = AdminManagedFile & {
  organizationId: string;
  category: CompanyDocumentCategory;
  sourceType: SupportingSourceType;
  sourceClassification: CompanyDocumentSourceClassification;
  reviewStatus: CompanyDocumentReviewStatus;
  confidentiality: CompanyDocumentConfidentiality;
  businessUnit: string;
  geography: string;
  roleFamily: string;
  leadershipLevel: string;
  effectiveDate: string;
  expiryDate: string;
  owner: string;
  version: string;
  extractedText?: string;
  extractedSummary: string;
  adminNotes: string;
};

export type CompanyKnowledgeConfiguration = {
  documents: AdminCompanyDocument[];
  useApprovedDocumentsOnly: boolean;
  requireSourceReferences: boolean;
  flagEvidenceConflicts: boolean;
};

export type AdminProgramDocument = AdminManagedFile & {
  documentType: ProgramDocumentType;
  reviewStatus: ProgramDocumentReviewStatus;
  extractedText?: string;
  extractedSummary: string;
  extractedFields: {
    programName?: string;
    objectives?: string;
    moduleThemes?: string;
    competencies?: string;
  };
};

export type OrganizationSetup = {
  id: string;
  organizationName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  defaultLanguage: string;
  region: string;
  dataRetentionNotes: string;
  idpPublishing: {
    enabled: boolean;
    mode: IdpPublishingMode;
    lockPublishedIdp: boolean;
  };
};

export type ProgramSetup = {
  programName: string;
  objectives: string;
  moduleThemes: string;
  competencies: string;
  documents: AdminProgramDocument[];
  prefillSourceDocumentId: string;
  verificationNotes: string;
  lastPrefilledAt: string;
};

export type IdpWorkflowConfiguration = {
  allowedApproaches: Array<Exclude<IdpMode, "comprehensive">>;
  enabledEvidenceSections: SupportingSourceType[];
  requiredFields: string[];
  leadershipAreas: {
    leadingSelf: boolean;
    leadingTeam: boolean;
    leadingBusiness: boolean;
  };
  defaultPriorityCount: number;
  reviewPeriod: string;
  managerReviewRequired: boolean;
};

export type EvidenceDocumentControls = {
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  framework702010Mode: Framework702010Mode;
  developmentFramework: DevelopmentFramework;
  requiredEvidenceByProgram: SupportingSourceType[];
  assessmentProviders: string[];
  competencyFrameworkFiles: AdminManagedFile[];
  secureDeletionEnabled: boolean;
  evidenceReviewStatus: EvidenceReviewStatus;
};

export type IdpReportConfiguration = {
  template: IdpReportTemplate;
  targetPageCount: string;
  maxPriorityCount: number;
  sectionOrder: string[];
  enabledSections: {
    purposeGuidance: boolean;
    executiveSummary: boolean;
    employeeInformation: boolean;
    leadershipContext: boolean;
    growThinkExecuteInspireAssessment: boolean;
    evidenceSummary: boolean;
    strengthsAndGaps: boolean;
    goalSettingCanvas: boolean;
    developmentPriorities: boolean;
    actionPlan: boolean;
    hitachiChallenge: boolean;
    masterclassReflectionJournal: boolean;
    midpointPeerFeedback: boolean;
    evidenceImpactTracker: boolean;
    finalIntegratedReflection: boolean;
    personalLeadershipCommitment: boolean;
    seniorLeaderWitness: boolean;
    continuationPlan: boolean;
    growModel: boolean;
    managerGuide: boolean;
    progressTracking: boolean;
    learningRecommendations: boolean;
    signatures: boolean;
  };
  showEvidenceConfidence: boolean;
  showAiDisclosure: boolean;
  showObjectivesNavigator: boolean;
  useOrganizationBranding: boolean;
  printFriendlyView: boolean;
  customInstructions: string;
};

export type AdminReportSectionKey = keyof IdpReportConfiguration["enabledSections"];

export type RevisionConfiguration = {
  allowParticipantRevisions: boolean;
  allowManagerSuggestedEdits: boolean;
  requireRevisionReason: boolean;
  requireManagerReapproval: boolean;
  showRevisionHistory: boolean;
  lockFinalizedIdp: boolean;
  revisionCadence: RevisionCadence;
  editableSections: string[];
};

export type AdminConfiguration = {
  organization: OrganizationSetup;
  organizations: OrganizationSetup[];
  selectedOrganizationId: string;
  participants: AdminParticipant[];
  program: ProgramSetup;
  companyKnowledge: CompanyKnowledgeConfiguration;
  idp: IdpWorkflowConfiguration;
  evidence: EvidenceDocumentControls;
  report: IdpReportConfiguration;
  revisions: RevisionConfiguration;
};

export const adminApproachOptions: Array<Exclude<IdpMode, "comprehensive">> = [
  "assessment_based",
  "program_based",
  "role_based",
];

export const adminEvidenceSectionOptions: SupportingSourceType[] = [
  "assessment",
  "program",
  "job_description",
  "role_description",
  "competency_framework",
  "organization_leadership_framework",
  "success_profile",
  "strategic_priorities",
  "manager_notes",
];

export const adminRequiredFieldOptions = [
  "employeeName",
  "position",
  "company",
  "department",
  "directManager",
  "aspiration",
  "reviewPeriod",
  "selectedApproach",
  "confirmedInsights",
] as const;

export const adminAllowedFileTypeOptions = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".xlsx",
] as const;

export const adminReportSectionOptions: AdminReportSectionKey[] = [
  "purposeGuidance",
  "employeeInformation",
  "executiveSummary",
  "strengthsAndGaps",
  "leadershipContext",
  "growThinkExecuteInspireAssessment",
  "evidenceSummary",
  "goalSettingCanvas",
  "developmentPriorities",
  "actionPlan",
  "hitachiChallenge",
  "masterclassReflectionJournal",
  "midpointPeerFeedback",
  "evidenceImpactTracker",
  "finalIntegratedReflection",
  "personalLeadershipCommitment",
  "seniorLeaderWitness",
  "continuationPlan",
  "growModel",
  "managerGuide",
  "progressTracking",
  "learningRecommendations",
  "signatures",
];

export const fixedReportSectionOrder: AdminReportSectionKey[] = [
  "purposeGuidance",
  "employeeInformation",
  "executiveSummary",
  "strengthsAndGaps",
];

export const defaultAdjustableReportSectionOrder: AdminReportSectionKey[] = [
  "leadershipContext",
  "growThinkExecuteInspireAssessment",
  "hitachiChallenge",
  "growModel",
  "actionPlan",
  "signatures",
  "goalSettingCanvas",
  "developmentPriorities",
  "evidenceSummary",
  "masterclassReflectionJournal",
  "midpointPeerFeedback",
  "evidenceImpactTracker",
  "finalIntegratedReflection",
  "personalLeadershipCommitment",
  "seniorLeaderWitness",
  "continuationPlan",
  "managerGuide",
  "progressTracking",
  "learningRecommendations",
];

export function buildReportSectionOrder(adjustableSections: AdminReportSectionKey[]) {
  const adjustableSet = new Set(defaultAdjustableReportSectionOrder);
  const normalizedAdjustable = uniqueList(
    adjustableSections.filter((section) => adjustableSet.has(section))
  );
  return [
    ...fixedReportSectionOrder,
    ...normalizedAdjustable,
    ...defaultAdjustableReportSectionOrder.filter((section) => !normalizedAdjustable.includes(section)),
  ];
}

export const adminRevisionSectionOptions = [
  "participantProfile",
  "confirmedInsights",
  "developmentPriorities",
  "actionsAndMilestones",
  "managerGuide",
  "progressUpdates",
  "learningRecommendations",
] as const;

const DEFAULT_ORGANIZATION_ID = "org-default";

function createDefaultOrganization(): OrganizationSetup {
  return {
    id: DEFAULT_ORGANIZATION_ID,
    organizationName: "Emeritus Client Organization",
    logoUrl: "",
    primaryColor: "#047857",
    secondaryColor: "#0f172a",
    defaultLanguage: "en",
    region: "Global",
    dataRetentionNotes:
      "Assessment reports and manager notes should be deleted when they are no longer needed for the active program cycle.",
    idpPublishing: {
      enabled: false,
      mode: "manual_finalize",
      lockPublishedIdp: false,
    },
  };
}

export function createDefaultAdminConfiguration(): AdminConfiguration {
  const organization = createDefaultOrganization();
  return {
    organization,
    organizations: [organization],
    selectedOrganizationId: organization.id,
    participants: [],
    program: {
      programName: "Leadership Development Program",
      objectives:
        "Build self-awareness, strengthen people leadership, and connect leadership behavior to measurable business impact.",
      moduleThemes:
        "Leading self, leading teams, stakeholder influence, business execution, coaching conversations.",
      competencies:
        "Strategic thinking, collaboration, coaching, accountability, communication, execution discipline.",
      documents: [],
      prefillSourceDocumentId: "",
      verificationNotes: "",
      lastPrefilledAt: "",
    },
    companyKnowledge: {
      documents: [],
      useApprovedDocumentsOnly: true,
      requireSourceReferences: true,
      flagEvidenceConflicts: true,
    },
    idp: {
      allowedApproaches: ["assessment_based", "program_based", "role_based"],
      enabledEvidenceSections: [
        "assessment",
        "program",
        "job_description",
        "role_description",
        "competency_framework",
      ],
      requiredFields: ["employeeName", "company", "directManager", "selectedApproach", "confirmedInsights"],
      leadershipAreas: {
        leadingSelf: true,
        leadingTeam: true,
        leadingBusiness: true,
      },
      defaultPriorityCount: 3,
      reviewPeriod: "90 days",
      managerReviewRequired: true,
    },
    evidence: {
      allowedFileTypes: [".pdf", ".docx", ".ppt", ".pptx", ".txt", ".csv", ".json", ".xlsx"],
      maxFileSizeMb: 25,
      framework702010Mode: "optional",
      developmentFramework: "experience_people_learning",
      requiredEvidenceByProgram: ["program", "manager_notes"],
      assessmentProviders: ["Hogan", "SHL", "OPQ", "360-degree feedback", "CliftonStrengths"],
      competencyFrameworkFiles: [],
      secureDeletionEnabled: true,
      evidenceReviewStatus: "draft",
    },
    report: {
      template: "standard",
      targetPageCount: "5-8 pages",
      maxPriorityCount: 3,
      sectionOrder: buildReportSectionOrder(defaultAdjustableReportSectionOrder),
      enabledSections: {
        purposeGuidance: true,
        executiveSummary: true,
        employeeInformation: true,
        leadershipContext: true,
        growThinkExecuteInspireAssessment: true,
        evidenceSummary: true,
        strengthsAndGaps: true,
        goalSettingCanvas: true,
        developmentPriorities: true,
        actionPlan: true,
        hitachiChallenge: true,
        masterclassReflectionJournal: true,
        midpointPeerFeedback: true,
        evidenceImpactTracker: true,
        finalIntegratedReflection: true,
        personalLeadershipCommitment: true,
        seniorLeaderWitness: true,
        continuationPlan: true,
        growModel: true,
        managerGuide: true,
        progressTracking: true,
        learningRecommendations: true,
        signatures: true,
      },
      showEvidenceConfidence: true,
      showAiDisclosure: true,
      showObjectivesNavigator: true,
      useOrganizationBranding: true,
      printFriendlyView: true,
      customInstructions:
        "Keep the report concise, action-oriented, manager-ready, and grounded in confirmed evidence.",
    },
    revisions: {
      allowParticipantRevisions: true,
      allowManagerSuggestedEdits: true,
      requireRevisionReason: true,
      requireManagerReapproval: true,
      showRevisionHistory: true,
      lockFinalizedIdp: false,
      revisionCadence: "quarterly",
      editableSections: [
        "developmentPriorities",
        "actionsAndMilestones",
        "managerGuide",
        "progressUpdates",
        "learningRecommendations",
      ],
    },
  };
}

function uniqueList<T>(items: T[]) {
  return Array.from(new Set(items));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeManagedFile(file: Partial<AdminManagedFile>, fallbackId: string): AdminManagedFile {
  return {
    id: file.id || fallbackId,
    name: file.name?.trim() || "Uploaded document",
    url: file.url || "",
    key: file.key || "",
    hash: file.hash || "",
    mimeType: file.mimeType || "application/octet-stream",
    size: Number.isFinite(file.size) ? Number(file.size) : 0,
    uploadedAt: file.uploadedAt || new Date().toISOString(),
    status: file.status || "pending_review",
  };
}

function normalizeCompanyDocument(
  file: Partial<AdminCompanyDocument>,
  index: number,
  organizationIds: Set<string>,
  fallbackOrganizationId: string
): AdminCompanyDocument {
  const managedFile = normalizeManagedFile(file, `company-document-${index + 1}`);
  const categories: CompanyDocumentCategory[] = [
    "strategy_business_priorities",
    "leadership_competency_framework",
    "culture_values",
    "organization_structure",
    "role_job_description",
    "role_career_architecture",
    "success_profile",
    "digital_ai_sustainability",
    "policy_other",
  ];
  const reviewStatuses: CompanyDocumentReviewStatus[] = [
    "needs_review",
    "approved",
    "superseded",
    "expired",
  ];
  const confidentialityLevels: CompanyDocumentConfidentiality[] = [
    "public",
    "internal",
    "confidential",
    "restricted",
  ];
  const sourceClassifications: CompanyDocumentSourceClassification[] = [
    "internal_official",
    "official_public",
    "industry_benchmark",
    "role_source",
  ];
  const sourceType = adminEvidenceSectionOptions.includes(file.sourceType as SupportingSourceType)
    ? (file.sourceType as SupportingSourceType)
    : "strategic_priorities";

  return {
    ...managedFile,
    organizationId: organizationIds.has(file.organizationId || "")
      ? file.organizationId || fallbackOrganizationId
      : fallbackOrganizationId,
    category: categories.includes(file.category as CompanyDocumentCategory)
      ? (file.category as CompanyDocumentCategory)
      : "policy_other",
    sourceType,
    sourceClassification: sourceClassifications.includes(
      file.sourceClassification as CompanyDocumentSourceClassification
    )
      ? (file.sourceClassification as CompanyDocumentSourceClassification)
      : "internal_official",
    reviewStatus: reviewStatuses.includes(file.reviewStatus as CompanyDocumentReviewStatus)
      ? (file.reviewStatus as CompanyDocumentReviewStatus)
      : "needs_review",
    confidentiality: confidentialityLevels.includes(
      file.confidentiality as CompanyDocumentConfidentiality
    )
      ? (file.confidentiality as CompanyDocumentConfidentiality)
      : "internal",
    businessUnit: file.businessUnit?.trim() || "",
    geography: file.geography?.trim() || "",
    roleFamily: file.roleFamily?.trim() || "",
    leadershipLevel: file.leadershipLevel?.trim() || "",
    effectiveDate: file.effectiveDate || "",
    expiryDate: file.expiryDate || "",
    owner: file.owner?.trim() || "",
    version: file.version?.trim() || "1.0",
    extractedText: file.extractedText || "",
    extractedSummary: file.extractedSummary || "",
    adminNotes: file.adminNotes || "",
  };
}

function normalizeProgramDocument(
  file: Partial<AdminProgramDocument>,
  index: number
): AdminProgramDocument {
  const managedFile = normalizeManagedFile(file, `program-document-${index + 1}`);
  const documentType: ProgramDocumentType =
    file.documentType === "program_brochure" ||
    file.documentType === "ppt_deck" ||
    file.documentType === "objectives_document" ||
    file.documentType === "other"
      ? file.documentType
      : "other";
  const reviewStatus: ProgramDocumentReviewStatus =
    file.reviewStatus === "verified" ? "verified" : "needs_review";

  return {
    ...managedFile,
    documentType,
    reviewStatus,
    extractedText: file.extractedText || "",
    extractedSummary: file.extractedSummary || "",
    extractedFields: {
      programName: file.extractedFields?.programName || "",
      objectives: file.extractedFields?.objectives || "",
      moduleThemes: file.extractedFields?.moduleThemes || "",
      competencies: file.extractedFields?.competencies || "",
    },
  };
}

function normalizeOrganization(
  organization: Partial<OrganizationSetup> | undefined,
  fallback: OrganizationSetup,
  index: number
): OrganizationSetup {
  const id = organization?.id?.trim() || (index === 0 ? fallback.id : `org-${index + 1}`);
  const publishingMode =
    organization?.idpPublishing?.mode === "publish_on_generation" ||
    organization?.idpPublishing?.mode === "manager_review_then_publish"
      ? organization.idpPublishing.mode
      : fallback.idpPublishing.mode;
  return {
    ...fallback,
    ...organization,
    id,
    organizationName: organization?.organizationName?.trim() || fallback.organizationName,
    logoUrl: organization?.logoUrl || "",
    primaryColor: organization?.primaryColor || fallback.primaryColor,
    secondaryColor: organization?.secondaryColor || fallback.secondaryColor,
    defaultLanguage: organization?.defaultLanguage || fallback.defaultLanguage,
    region: organization?.region || fallback.region,
    dataRetentionNotes: organization?.dataRetentionNotes || fallback.dataRetentionNotes,
    idpPublishing: {
      enabled: Boolean(organization?.idpPublishing?.enabled ?? fallback.idpPublishing.enabled),
      mode: publishingMode,
      lockPublishedIdp: Boolean(
        organization?.idpPublishing?.lockPublishedIdp ?? fallback.idpPublishing.lockPublishedIdp
      ),
    },
  };
}

export function normalizeAdminConfiguration(config: AdminConfiguration | Partial<AdminConfiguration>): AdminConfiguration {
  const defaults = createDefaultAdminConfiguration();
  const rawConfig = config || {};
  const legacyOrganization = normalizeOrganization(rawConfig.organization, defaults.organization, 0);
  const rawOrganizations =
    Array.isArray(rawConfig.organizations) && rawConfig.organizations.length > 0
      ? rawConfig.organizations
      : [legacyOrganization];
  const organizations = uniqueById(
    rawOrganizations.map((organization, index) =>
      normalizeOrganization(organization, index === 0 ? legacyOrganization : defaults.organization, index)
    )
  );
  const normalizedOrganizations = organizations.length > 0 ? organizations : [defaults.organization];
  const selectedOrganizationId = normalizedOrganizations.some(
    (organization) => organization.id === rawConfig.selectedOrganizationId
  )
    ? rawConfig.selectedOrganizationId || normalizedOrganizations[0].id
    : normalizedOrganizations[0].id;
  const selectedOrganization =
    normalizedOrganizations.find((organization) => organization.id === selectedOrganizationId) ||
    normalizedOrganizations[0];
  const organizationIds = new Set(normalizedOrganizations.map((organization) => organization.id));
  const allowedApproaches = uniqueList(
    (rawConfig.idp?.allowedApproaches || defaults.idp.allowedApproaches).filter((mode): mode is Exclude<IdpMode, "comprehensive"> =>
      adminApproachOptions.includes(mode as Exclude<IdpMode, "comprehensive">)
    )
  );
  const enabledEvidenceSections = uniqueList(
    (rawConfig.idp?.enabledEvidenceSections || defaults.idp.enabledEvidenceSections).filter((source) => adminEvidenceSectionOptions.includes(source))
  );
  const requiredEvidenceByProgram = uniqueList(
    (rawConfig.evidence?.requiredEvidenceByProgram || defaults.evidence.requiredEvidenceByProgram).filter((source) => adminEvidenceSectionOptions.includes(source))
  );
  const allowedFileTypes = uniqueList(
    (rawConfig.evidence?.allowedFileTypes || defaults.evidence.allowedFileTypes)
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.startsWith(".") && type.length > 1)
  );
  const developmentFramework = developmentFrameworks.includes(
    rawConfig.evidence?.developmentFramework as DevelopmentFramework
  )
    ? rawConfig.evidence?.developmentFramework
    : defaults.evidence.developmentFramework;
  const reportEnabledSections = {
    ...defaults.report.enabledSections,
    ...rawConfig.report?.enabledSections,
  };
  fixedReportSectionOrder.forEach((section) => {
    reportEnabledSections[section] = true;
  });
  const rawReportSectionOrder = uniqueList(
    (rawConfig.report?.sectionOrder || defaults.report.sectionOrder).filter((section) =>
      adminReportSectionOptions.includes(section as keyof IdpReportConfiguration["enabledSections"])
    )
  ) as AdminReportSectionKey[];
  const sectionOrder = buildReportSectionOrder(
    rawReportSectionOrder.filter((section) => !fixedReportSectionOrder.includes(section))
  );
  const editableSections = uniqueList(
    (rawConfig.revisions?.editableSections || defaults.revisions.editableSections).filter((section) =>
      adminRevisionSectionOptions.includes(section as (typeof adminRevisionSectionOptions)[number])
    )
  );

  return {
    organization: selectedOrganization,
    organizations: normalizedOrganizations,
    selectedOrganizationId,
    participants: (rawConfig.participants || []).map((participant, index) => ({
      ...participant,
      id: participant.id || `participant-${index + 1}`,
      organizationId: normalizedOrganizations.some((organization) => organization.id === participant.organizationId)
        ? participant.organizationId
        : selectedOrganizationId,
      name: participant.name.trim(),
      email: participant.email.trim(),
      generatedPassword: participant.generatedPassword?.trim() || "",
      status: participant.status || "invited",
      addedAt: participant.addedAt || new Date().toISOString(),
    })),
    program: {
      ...defaults.program,
      ...rawConfig.program,
      programName: rawConfig.program?.programName?.trim() || defaults.program.programName,
      objectives: rawConfig.program?.objectives || defaults.program.objectives,
      moduleThemes: rawConfig.program?.moduleThemes || defaults.program.moduleThemes,
      competencies: rawConfig.program?.competencies || defaults.program.competencies,
      documents: (rawConfig.program?.documents || defaults.program.documents).map(normalizeProgramDocument),
      prefillSourceDocumentId: rawConfig.program?.prefillSourceDocumentId || "",
      verificationNotes: rawConfig.program?.verificationNotes || "",
      lastPrefilledAt: rawConfig.program?.lastPrefilledAt || "",
    },
    companyKnowledge: {
      ...defaults.companyKnowledge,
      ...rawConfig.companyKnowledge,
      documents: uniqueById(
        (rawConfig.companyKnowledge?.documents || defaults.companyKnowledge.documents).map((document, index) =>
          normalizeCompanyDocument(document, index, organizationIds, selectedOrganizationId)
        )
      ),
      useApprovedDocumentsOnly: Boolean(
        rawConfig.companyKnowledge?.useApprovedDocumentsOnly ??
          defaults.companyKnowledge.useApprovedDocumentsOnly
      ),
      requireSourceReferences: Boolean(
        rawConfig.companyKnowledge?.requireSourceReferences ?? defaults.companyKnowledge.requireSourceReferences
      ),
      flagEvidenceConflicts: Boolean(
        rawConfig.companyKnowledge?.flagEvidenceConflicts ?? defaults.companyKnowledge.flagEvidenceConflicts
      ),
    },
    idp: {
      ...defaults.idp,
      ...rawConfig.idp,
      allowedApproaches: allowedApproaches.length > 0 ? allowedApproaches : defaults.idp.allowedApproaches,
      enabledEvidenceSections:
        enabledEvidenceSections.length > 0 ? enabledEvidenceSections : defaults.idp.enabledEvidenceSections,
      requiredFields: uniqueList((rawConfig.idp?.requiredFields || defaults.idp.requiredFields).filter(Boolean)),
      leadershipAreas: {
        leadingSelf: true,
        leadingTeam: Boolean(rawConfig.idp?.leadershipAreas?.leadingTeam ?? defaults.idp.leadershipAreas.leadingTeam),
        leadingBusiness: Boolean(rawConfig.idp?.leadershipAreas?.leadingBusiness ?? defaults.idp.leadershipAreas.leadingBusiness),
      },
      defaultPriorityCount: clampNumber(rawConfig.idp?.defaultPriorityCount ?? defaults.idp.defaultPriorityCount, 1, 5, defaults.idp.defaultPriorityCount),
      reviewPeriod: rawConfig.idp?.reviewPeriod?.trim() || defaults.idp.reviewPeriod,
      managerReviewRequired: Boolean(rawConfig.idp?.managerReviewRequired ?? defaults.idp.managerReviewRequired),
    },
    evidence: {
      ...defaults.evidence,
      ...rawConfig.evidence,
      allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : defaults.evidence.allowedFileTypes,
      maxFileSizeMb: clampNumber(rawConfig.evidence?.maxFileSizeMb ?? defaults.evidence.maxFileSizeMb, 1, 100, defaults.evidence.maxFileSizeMb),
      developmentFramework: developmentFramework || defaults.evidence.developmentFramework,
      requiredEvidenceByProgram,
      assessmentProviders: uniqueList(
        (rawConfig.evidence?.assessmentProviders || defaults.evidence.assessmentProviders).map((provider) => provider.trim()).filter(Boolean)
      ),
      competencyFrameworkFiles: (rawConfig.evidence?.competencyFrameworkFiles || defaults.evidence.competencyFrameworkFiles).map((file, index) =>
        normalizeManagedFile(file, `competency-framework-${index + 1}`)
      ),
      secureDeletionEnabled: Boolean(rawConfig.evidence?.secureDeletionEnabled ?? defaults.evidence.secureDeletionEnabled),
    },
    report: {
      ...defaults.report,
      ...rawConfig.report,
      template:
        rawConfig.report?.template === "executive" ||
        rawConfig.report?.template === "manager_review" ||
        rawConfig.report?.template === "custom"
          ? rawConfig.report.template
          : defaults.report.template,
      targetPageCount: rawConfig.report?.targetPageCount?.trim() || defaults.report.targetPageCount,
      maxPriorityCount: clampNumber(rawConfig.report?.maxPriorityCount ?? defaults.report.maxPriorityCount, 1, 5, defaults.report.maxPriorityCount),
      sectionOrder,
      enabledSections: reportEnabledSections,
      showEvidenceConfidence: Boolean(rawConfig.report?.showEvidenceConfidence ?? defaults.report.showEvidenceConfidence),
      showAiDisclosure: Boolean(rawConfig.report?.showAiDisclosure ?? defaults.report.showAiDisclosure),
      showObjectivesNavigator: Boolean(rawConfig.report?.showObjectivesNavigator ?? defaults.report.showObjectivesNavigator),
      useOrganizationBranding: Boolean(rawConfig.report?.useOrganizationBranding ?? defaults.report.useOrganizationBranding),
      printFriendlyView: Boolean(rawConfig.report?.printFriendlyView ?? defaults.report.printFriendlyView),
      customInstructions: rawConfig.report?.customInstructions || defaults.report.customInstructions,
    },
    revisions: {
      ...defaults.revisions,
      ...rawConfig.revisions,
      allowParticipantRevisions: Boolean(rawConfig.revisions?.allowParticipantRevisions ?? defaults.revisions.allowParticipantRevisions),
      allowManagerSuggestedEdits: Boolean(rawConfig.revisions?.allowManagerSuggestedEdits ?? defaults.revisions.allowManagerSuggestedEdits),
      requireRevisionReason: Boolean(rawConfig.revisions?.requireRevisionReason ?? defaults.revisions.requireRevisionReason),
      requireManagerReapproval: Boolean(rawConfig.revisions?.requireManagerReapproval ?? defaults.revisions.requireManagerReapproval),
      showRevisionHistory: Boolean(rawConfig.revisions?.showRevisionHistory ?? defaults.revisions.showRevisionHistory),
      lockFinalizedIdp: Boolean(rawConfig.revisions?.lockFinalizedIdp ?? defaults.revisions.lockFinalizedIdp),
      revisionCadence:
        rawConfig.revisions?.revisionCadence === "on_demand" ||
        rawConfig.revisions?.revisionCadence === "monthly" ||
        rawConfig.revisions?.revisionCadence === "program_milestone"
          ? rawConfig.revisions.revisionCadence
          : defaults.revisions.revisionCadence,
      editableSections: editableSections.length > 0 ? editableSections : defaults.revisions.editableSections,
    },
  };
}
