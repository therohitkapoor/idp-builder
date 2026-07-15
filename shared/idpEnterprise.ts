export const idpModes = [
  "assessment_based",
  "program_based",
  "role_based",
  "comprehensive",
] as const;

export type IdpMode = (typeof idpModes)[number];

export const supportingSourceTypes = [
  "assessment",
  "program",
  "job_description",
  "role_description",
  "competency_framework",
  "organization_leadership_framework",
  "success_profile",
  "strategic_priorities",
  "manager_notes",
  "participant_goals",
  "organization_goals",
  "other",
] as const;

export type SupportingSourceType = (typeof supportingSourceTypes)[number];

export const developmentFrameworks = [
  "flexible",
  "experience_people_learning",
  "70_20_10",
  "grow",
  "custom",
] as const;

export type DevelopmentFramework = (typeof developmentFrameworks)[number];

export const insightCategories = [
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
] as const;

export type ExtractedInsightCategory = (typeof insightCategories)[number];

export const insightStatuses = ["accepted", "edited", "removed", "flagged"] as const;
export type ExtractedInsightStatus = (typeof insightStatuses)[number];

export const objectiveProgressStatuses = [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
  "revised",
] as const;

export type ObjectiveProgressStatus = (typeof objectiveProgressStatuses)[number];

export type UploadedSourceFile = {
  id: string;
  name: string;
  url?: string;
  key: string;
  sourceType: SupportingSourceType;
  mimeType: string;
  size: number;
  hash: string;
  status: "uploaded" | "ready" | "failed";
  progress: number;
  uploadedAt: string;
  extractedText?: string;
  extractedSummary?: string;
};

export type AssessmentInput = {
  id: string;
  assessmentType: string;
  provider: string;
  assessmentDate: string;
  summary: string;
  files: UploadedSourceFile[];
};

export type ProgramInputs = {
  programName: string;
  objectives: string;
  moduleThemes: string;
  keyCompetencies: string;
  facultyCoachNotes: string;
  learningSummary: string;
  programDocuments: UploadedSourceFile[];
  participantAssignments: UploadedSourceFile[];
};

export type RoleOrganizationInputs = {
  jobDescriptionFiles: UploadedSourceFile[];
  roleDescriptionFiles: UploadedSourceFile[];
  competencyFrameworkFiles: UploadedSourceFile[];
  organizationLeadershipFrameworkFiles: UploadedSourceFile[];
  successProfileFiles: UploadedSourceFile[];
  strategicPriorityFiles: UploadedSourceFile[];
  futureRoleExpectations: string;
  successMeasures: string;
};

export type ManagerInputs = {
  conversationSummary: string;
  conversationFiles: UploadedSourceFile[];
  agreedDevelopmentGoals: string;
  strengthsIdentified: string;
  developmentAreasIdentified: string;
  supportExpected: string;
  reviewCadence: string;
};

export type ParticipantInputs = {
  careerAspiration: string;
  developmentPriorities: string;
  currentChallenges: string;
  desiredBusinessImpact: string;
  additionalContext: string;
};

export type EnterpriseContextInputs = {
  assessments: AssessmentInput[];
  program: ProgramInputs;
  roleOrganization: RoleOrganizationInputs;
  manager: ManagerInputs;
  participant: ParticipantInputs;
};

export type ExtractedInsight = {
  id: string;
  category: ExtractedInsightCategory;
  text: string;
  sourceType: SupportingSourceType;
  sourceLabel: string;
  confidence: "low" | "medium" | "high";
  status: ExtractedInsightStatus;
  userConfirmed: boolean;
  aiInferred: boolean;
  notes?: string;
};

export type OrganizationConfig = {
  organizationName: string;
  organizationLogo?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  competencyFramework?: string;
  leadershipFramework?: string;
  programObjectives?: string;
  roleArchitecture?: string;
  successProfiles?: string;
  approvedDevelopmentFramework?: DevelopmentFramework;
  approvedLearningCatalog?: string;
  idpOutputTemplate?: string;
  idpReportConfiguration?: Record<string, unknown>;
  revisionConfiguration?: Record<string, unknown>;
};

export type ManagerSuggestedEdit = {
  id: string;
  objectiveIndex: number;
  field: string;
  currentValue: string;
  suggestedValue: string;
  rationale?: string;
  status: "pending" | "accepted" | "rejected";
};

export type ManagerPriorityComment = {
  id: string;
  objectiveIndex: number;
  comment: string;
  createdAt: string;
};

export type ManagerReview = {
  status: "not_submitted" | "submitted" | "changes_requested" | "reviewed";
  submittedAt?: string;
  reviewedAt?: string;
  managerName?: string;
  managerSummaryComment?: string;
  agreedReviewDates: string[];
  comments: ManagerPriorityComment[];
  suggestedEdits: ManagerSuggestedEdit[];
};

export type PriorityCheckIn = {
  id: string;
  objectiveIndex: number;
  createdAt: string;
  whatTried: string;
  whatHappened: string;
  whatChanged: string;
  whatGotInTheWay: string;
  whatNext: string;
  supportNeeded: string;
};

export type EnterpriseIdpContext = {
  participantProfile: {
    employeeName: string;
    position?: string | null;
    company: string;
    department?: string | null;
    yearsOfExperience?: number | null;
    directManager?: string | null;
    aspiration?: string | null;
    reviewPeriod?: string | null;
  };
  selectedMode: IdpMode;
  supportingSources: SupportingSourceType[];
  developmentFramework: DevelopmentFramework;
  uploadedEvidence: UploadedSourceFile[];
  contextInputs: EnterpriseContextInputs;
  confirmedInsights: ExtractedInsight[];
  organizationContext: OrganizationConfig;
};

export const createEmptyEnterpriseContextInputs = (): EnterpriseContextInputs => ({
  assessments: [],
  program: {
    programName: "",
    objectives: "",
    moduleThemes: "",
    keyCompetencies: "",
    facultyCoachNotes: "",
    learningSummary: "",
    programDocuments: [],
    participantAssignments: [],
  },
  roleOrganization: {
    jobDescriptionFiles: [],
    roleDescriptionFiles: [],
    competencyFrameworkFiles: [],
    organizationLeadershipFrameworkFiles: [],
    successProfileFiles: [],
    strategicPriorityFiles: [],
    futureRoleExpectations: "",
    successMeasures: "",
  },
  manager: {
    conversationSummary: "",
    conversationFiles: [],
    agreedDevelopmentGoals: "",
    strengthsIdentified: "",
    developmentAreasIdentified: "",
    supportExpected: "",
    reviewCadence: "",
  },
  participant: {
    careerAspiration: "",
    developmentPriorities: "",
    currentChallenges: "",
    desiredBusinessImpact: "",
    additionalContext: "",
  },
});

export const createDefaultManagerReview = (managerName?: string | null): ManagerReview => ({
  status: "not_submitted",
  managerName: managerName || "",
  agreedReviewDates: [],
  comments: [],
  suggestedEdits: [],
});
