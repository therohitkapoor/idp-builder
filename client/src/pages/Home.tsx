import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  MessageSquare,
  NotebookPen,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector, {
  applyLanguagePreference,
  getLanguageLabel,
  getStoredOutputLanguage,
  type LanguageCode,
} from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { translateReportText } from "@/lib/reportTranslation";
import { trpc } from "@/lib/trpc";
import {
  createEmptyEnterpriseContextInputs,
  type DevelopmentFramework,
  type EnterpriseContextInputs,
  type ExtractedInsight,
  type IdpMode,
  type SupportingSourceType,
  type UploadedSourceFile,
} from "@shared/idpEnterprise";

type EmployeeDetails = {
  employeeName: string;
  position: string;
  company: string;
  department: string;
  yearsOfExperience: string;
  dateOfJoining: string;
  dateOfIdpCreation: string;
  directManager: string;
  programmeName: string;
  aspiration: string;
  reviewPeriod: string;
};

type ReflectionStep = {
  id: "leadingSelf" | "leadingTeam" | "leadingBusiness";
  titleKey: string;
  shortTitleKey: string;
  descriptionKey: string;
  promptKey: string;
  questionKeys: string[];
  outputKey: string;
  suggestionKey: string;
  icon: typeof User;
};

type LeadershipAreaId = ReflectionStep["id"];
type EvidenceSectionKey = "assessment" | "program" | "roleOrganization";

type FileTarget =
  | { type: "assessment"; assessmentId: string }
  | { type: "programDocuments" }
  | { type: "participantAssignments" }
  | { type: "jobDescriptionFiles" }
  | { type: "roleDescriptionFiles" }
  | { type: "competencyFrameworkFiles" }
  | { type: "organizationLeadershipFrameworkFiles" }
  | { type: "successProfileFiles" }
  | { type: "strategicPriorityFiles" }
  | { type: "managerConversationFiles" };

const DRAFT_KEY = "emeritus-enterprise-idp-draft-v1";

const reflectionStepDefinitions: ReflectionStep[] = [
  {
    id: "leadingSelf",
    titleKey: "leadingSelfTitle",
    shortTitleKey: "leadingSelfShort",
    descriptionKey: "leadingSelfDescription",
    promptKey: "leadingSelfPrompt",
    questionKeys: [
      "enterpriseLeadingSelfQ1",
      "enterpriseLeadingSelfQ2",
      "enterpriseLeadingSelfQ3",
      "enterpriseLeadingSelfQ4",
      "enterpriseLeadingSelfQ5",
      "enterpriseLeadingSelfQ6",
    ],
    outputKey: "leadingSelfOutput",
    suggestionKey: "leadingSelfSuggestion",
    icon: User,
  },
  {
    id: "leadingTeam",
    titleKey: "leadingTeamTitle",
    shortTitleKey: "leadingTeamShort",
    descriptionKey: "leadingTeamDescription",
    promptKey: "leadingTeamPrompt",
    questionKeys: [
      "enterpriseLeadingTeamQ1",
      "enterpriseLeadingTeamQ2",
      "enterpriseLeadingTeamQ3",
      "enterpriseLeadingTeamQ4",
      "enterpriseLeadingTeamQ5",
    ],
    outputKey: "leadingTeamOutput",
    suggestionKey: "leadingTeamSuggestion",
    icon: Users,
  },
  {
    id: "leadingBusiness",
    titleKey: "leadingBusinessTitle",
    shortTitleKey: "leadingBusinessShort",
    descriptionKey: "leadingBusinessDescription",
    promptKey: "leadingBusinessPrompt",
    questionKeys: [
      "enterpriseLeadingBusinessQ1",
      "enterpriseLeadingBusinessQ2",
      "enterpriseLeadingBusinessQ3",
      "enterpriseLeadingBusinessQ4",
      "enterpriseLeadingBusinessQ5",
    ],
    outputKey: "leadingBusinessOutput",
    suggestionKey: "leadingBusinessSuggestion",
    icon: Building2,
  },
];

const sourceLabelKeys: Record<SupportingSourceType, string> = {
  assessment: "sourceAssessment",
  program: "sourceProgram",
  job_description: "sourceJobDescription",
  role_description: "sourceRoleDescription",
  competency_framework: "sourceCompetencyFramework",
  organization_leadership_framework: "sourceLeadershipFramework",
  success_profile: "sourceSuccessProfile",
  strategic_priorities: "sourceStrategicPriorities",
  manager_notes: "sourceManagerNotes",
  participant_goals: "sourceParticipantGoals",
  organization_goals: "sourceOrganizationGoals",
  other: "sourceOther",
};

const getSourceLabel = (source: SupportingSourceType, translate: (key: string) => string) =>
  translate(sourceLabelKeys[source] || "sourceOther");

const idpModeConfig: Array<{
  id: IdpMode;
  icon: typeof Target;
  titleKey: string;
  descriptionKey: string;
  bulletKeys: string[];
}> = [
  {
    id: "assessment_based",
    icon: ClipboardCheck,
    titleKey: "modeAssessmentTitle",
    descriptionKey: "modeAssessmentDescription",
    bulletKeys: ["modeAssessmentBullet1", "modeAssessmentBullet2", "modeAssessmentBullet3"],
  },
  {
    id: "program_based",
    icon: BookOpen,
    titleKey: "modeProgramTitle",
    descriptionKey: "modeProgramDescription",
    bulletKeys: ["modeProgramBullet1", "modeProgramBullet2", "modeProgramBullet3"],
  },
  {
    id: "role_based",
    icon: BriefcaseBusiness,
    titleKey: "modeRoleTitle",
    descriptionKey: "modeRoleDescription",
    bulletKeys: ["modeRoleBullet1", "modeRoleBullet2", "modeRoleBullet3"],
  },
];

const idpModeIds = idpModeConfig.map((mode) => mode.id);

const approachEvidenceConfig: Record<IdpMode, { sections: EvidenceSectionKey[]; sources: SupportingSourceType[] }> = {
  assessment_based: {
    sections: ["assessment"],
    sources: ["assessment"],
  },
  program_based: {
    sections: ["program"],
    sources: ["program"],
  },
  role_based: {
    sections: ["roleOrganization"],
    sources: [
      "job_description",
      "role_description",
      "competency_framework",
      "organization_leadership_framework",
      "success_profile",
      "strategic_priorities",
    ],
  },
  comprehensive: {
    sections: ["assessment", "program", "roleOrganization"],
    sources: [
      "assessment",
      "program",
      "job_description",
      "role_description",
      "competency_framework",
      "organization_leadership_framework",
      "success_profile",
      "strategic_priorities",
      "organization_goals",
    ],
  },
};

const defaultEvidenceSources: SupportingSourceType[] = ["manager_notes", "participant_goals"];

const normalizeSelectedApproaches = (value: unknown): IdpMode[] => {
  if (!Array.isArray(value)) return [];
  if (value.includes("comprehensive")) {
    return ["assessment_based", "program_based", "role_based"];
  }
  const valid = value.filter((mode): mode is IdpMode => idpModeIds.includes(mode as IdpMode));
  return Array.from(new Set(valid));
};

const derivePrimaryMode = (approaches: IdpMode[]): IdpMode => approaches[0] || "program_based";

const deriveSupportingSources = (approaches: IdpMode[]) =>
  Array.from(
    new Set([
      ...approaches.flatMap((mode) => approachEvidenceConfig[mode]?.sources || []),
      ...(approaches.length > 0 ? defaultEvidenceSources : []),
    ])
  );

const deriveEvidenceSourceTypes = (approaches: IdpMode[]) =>
  Array.from(new Set(approaches.flatMap((mode) => approachEvidenceConfig[mode]?.sources || [])));

const deriveEvidenceSections = (approaches: IdpMode[]) =>
  Array.from(new Set(approaches.flatMap((mode) => approachEvidenceConfig[mode]?.sections || [])));

const evidenceSourceSectionMap: Partial<Record<SupportingSourceType, EvidenceSectionKey>> = {
  assessment: "assessment",
  program: "program",
  job_description: "roleOrganization",
  role_description: "roleOrganization",
  competency_framework: "roleOrganization",
  organization_leadership_framework: "roleOrganization",
  success_profile: "roleOrganization",
  strategic_priorities: "roleOrganization",
};

const filterEvidenceSourcesByConfig = (
  sources: SupportingSourceType[],
  enabledSources?: SupportingSourceType[]
) => {
  if (!enabledSources || enabledSources.length === 0) return sources;
  const enabled = new Set(enabledSources);
  return sources.filter((source) => enabled.has(source));
};

const deriveEvidenceSectionsFromSources = (sources: SupportingSourceType[]) =>
  Array.from(
    new Set(
      sources
        .map((source) => evidenceSourceSectionMap[source])
        .filter((section): section is EvidenceSectionKey => Boolean(section))
    )
  );

const scopeContextInputs = (contextInputs: EnterpriseContextInputs, sections: EvidenceSectionKey[]) => {
  const emptyContext = createEmptyEnterpriseContextInputs();
  const sectionSet = new Set(sections);

  return {
    assessments: sectionSet.has("assessment") ? contextInputs.assessments : [],
    program: sectionSet.has("program") ? contextInputs.program : emptyContext.program,
    roleOrganization: sectionSet.has("roleOrganization") ? contextInputs.roleOrganization : emptyContext.roleOrganization,
    manager: contextInputs.manager,
    participant: contextInputs.participant,
  };
};

const frameworkOptions: Array<{ value: DevelopmentFramework; labelKey: string }> = [
  { value: "experience_people_learning", labelKey: "frameworkExperiencePeopleLearning" },
  { value: "flexible", labelKey: "frameworkFlexible" },
  { value: "70_20_10", labelKey: "framework702010" },
  { value: "grow", labelKey: "frameworkGrow" },
  { value: "custom", labelKey: "frameworkCustom" },
];

const getAdminDrivenFramework = (
  configuredFramework?: DevelopmentFramework,
  mode?: "hidden" | "optional" | "enabled"
): DevelopmentFramework => {
  if (mode === "enabled") return "70_20_10";
  if (mode === "hidden" && configuredFramework === "70_20_10") return "experience_people_learning";
  return configuredFramework || "experience_people_learning";
};

const getFileExtension = (filename: string) => {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getGenerationErrorMessage = (error: unknown, translate: (key: string) => string) => {
  if (error instanceof Error && error.message) {
    if (error.message.includes("dateOfJoining")) return translate("dateOfJoiningError");
    return error.message;
  }

  return translate("generationErrorDefault");
};

const getReflectionProgress = (reflections: Record<string, string>, steps: ReflectionStep[]) => {
  if (steps.length === 0) return 0;
  const complete = steps.filter((step) => reflections[step.id]?.trim()).length;
  return Math.round((complete / steps.length) * 100);
};

const fileSizeLabel = (size: number) => {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

const fileToBase64 = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const hashFile = async (file: File) => {
  if (!crypto.subtle) return `${file.name}:${file.size}:${file.lastModified}`;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const addFileToContext = (
  context: EnterpriseContextInputs,
  target: FileTarget,
  file: UploadedSourceFile
): EnterpriseContextInputs => {
  if (target.type === "assessment") {
    const hasAssessment = context.assessments.some((assessment) => assessment.id === target.assessmentId);
    return {
      ...context,
      assessments: hasAssessment
        ? context.assessments.map((assessment) =>
            assessment.id === target.assessmentId
              ? { ...assessment, files: [...assessment.files, file] }
              : assessment
          )
        : [
            ...context.assessments,
            {
              id: target.assessmentId,
              assessmentType: "",
              provider: "",
              assessmentDate: "",
              summary: "",
              files: [file],
            },
          ],
    };
  }

  if (target.type === "programDocuments" || target.type === "participantAssignments") {
    return {
      ...context,
      program: {
        ...context.program,
        [target.type]: [...context.program[target.type], file],
      },
    };
  }

  if (target.type === "managerConversationFiles") {
    return {
      ...context,
      manager: {
        ...context.manager,
        conversationFiles: [...context.manager.conversationFiles, file],
      },
    };
  }

  return {
    ...context,
    roleOrganization: {
      ...context.roleOrganization,
      [target.type]: [...context.roleOrganization[target.type], file],
    },
  };
};

const removeFileFromContext = (context: EnterpriseContextInputs, fileId: string): EnterpriseContextInputs => ({
  ...context,
  assessments: context.assessments.map((assessment) => ({
    ...assessment,
    files: assessment.files.filter((file) => file.id !== fileId),
  })),
  program: {
    ...context.program,
    programDocuments: context.program.programDocuments.filter((file) => file.id !== fileId),
    participantAssignments: context.program.participantAssignments.filter((file) => file.id !== fileId),
  },
  roleOrganization: {
    ...context.roleOrganization,
    jobDescriptionFiles: context.roleOrganization.jobDescriptionFiles.filter((file) => file.id !== fileId),
    roleDescriptionFiles: context.roleOrganization.roleDescriptionFiles.filter((file) => file.id !== fileId),
    competencyFrameworkFiles: context.roleOrganization.competencyFrameworkFiles.filter((file) => file.id !== fileId),
    organizationLeadershipFrameworkFiles: context.roleOrganization.organizationLeadershipFrameworkFiles.filter((file) => file.id !== fileId),
    successProfileFiles: context.roleOrganization.successProfileFiles.filter((file) => file.id !== fileId),
    strategicPriorityFiles: context.roleOrganization.strategicPriorityFiles.filter((file) => file.id !== fileId),
  },
  manager: {
    ...context.manager,
    conversationFiles: context.manager.conversationFiles.filter((file) => file.id !== fileId),
  },
});

export default function Home() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => getStoredOutputLanguage());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails>({
    employeeName: "",
    position: "",
    company: "",
    department: "",
    yearsOfExperience: "",
    dateOfJoining: "",
    dateOfIdpCreation: new Date().toISOString().split("T")[0],
    directManager: "",
    programmeName: "",
    aspiration: "",
    reviewPeriod: "90 days",
  });
  const [selectedMode, setSelectedMode] = useState<IdpMode>("program_based");
  const [selectedApproaches, setSelectedApproaches] = useState<IdpMode[]>(["program_based"]);
  const [supportingSources, setSupportingSources] = useState<SupportingSourceType[]>(deriveSupportingSources(["program_based"]));
  const [selectedLeadershipAreas, setSelectedLeadershipAreas] = useState<Record<LeadershipAreaId, boolean>>({
    leadingSelf: true,
    leadingTeam: true,
    leadingBusiness: true,
  });
  const [developmentFramework, setDevelopmentFramework] = useState<DevelopmentFramework>("experience_people_learning");
  const [contextInputs, setContextInputs] = useState<EnterpriseContextInputs>(() => ({
    ...createEmptyEnterpriseContextInputs(),
    assessments: [
      {
        id: "assessment-1",
        assessmentType: "",
        provider: "",
        assessmentDate: "",
        summary: "",
        files: [],
      },
    ],
  }));
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({});
  const [sourceFiles, setSourceFiles] = useState<UploadedSourceFile[]>([]);
  const [organizationLogo, setOrganizationLogo] = useState("");
  const [insights, setInsights] = useState<ExtractedInsight[]>([]);
  const [insightsConfirmed, setInsightsConfirmed] = useState(false);
  const [uploadingTargets, setUploadingTargets] = useState<Record<string, number>>({});
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing">("idle");
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { data: enterpriseDefaults } = trpc.idp.getEnterpriseDefaults.useQuery();
  const uploadFileMutation = trpc.idp.uploadFile.useMutation();
  const extractInsightsMutation = trpc.idp.extractInsights.useMutation();
  const generateIdpMutation = trpc.idp.generateIdp.useMutation();

  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_KEY);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        if (draft.employeeDetails) setEmployeeDetails(draft.employeeDetails);
        const draftApproaches = normalizeSelectedApproaches(draft.selectedApproaches);
        if (draftApproaches.length > 0) {
          setSelectedApproaches(draftApproaches);
          setSelectedMode(derivePrimaryMode(draftApproaches));
          setSupportingSources(deriveSupportingSources(draftApproaches));
        } else if (draft.selectedMode) {
          const fallbackApproaches = normalizeSelectedApproaches([draft.selectedMode]);
          setSelectedApproaches(fallbackApproaches);
          setSelectedMode(derivePrimaryMode(fallbackApproaches));
          setSupportingSources(deriveSupportingSources(fallbackApproaches));
        }
        if (draft.selectedLeadershipAreas) {
          setSelectedLeadershipAreas({
            leadingSelf: true,
            leadingTeam: draft.selectedLeadershipAreas.leadingTeam !== false,
            leadingBusiness: draft.selectedLeadershipAreas.leadingBusiness !== false,
          });
        }
        if (draft.supportingSources && !draft.selectedApproaches) setSupportingSources(draft.supportingSources);
        if (draft.developmentFramework) setDevelopmentFramework(draft.developmentFramework);
        if (draft.contextInputs) setContextInputs(draft.contextInputs);
        if (draft.reflections) setReflections(draft.reflections);
        if (draft.confidenceRatings) setConfidenceRatings(draft.confidenceRatings);
        if (draft.sourceFiles) setSourceFiles(draft.sourceFiles);
        if (draft.organizationLogo) setOrganizationLogo(draft.organizationLogo);
        if (draft.insights) setInsights(draft.insights);
        if (draft.insightsConfirmed) setInsightsConfirmed(draft.insightsConfirmed);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded || !enterpriseDefaults) return;

    const participantProfile = enterpriseDefaults.participantProfile;
    const participantUser = user?.role === "user" ? user : null;
    const adminFramework = getAdminDrivenFramework(
      enterpriseDefaults.evidence.developmentFramework,
      enterpriseDefaults.evidence.framework702010Mode
    );

    setEmployeeDetails((prev) => ({
      ...prev,
      employeeName:
        participantUser
          ? participantProfile?.name || participantUser.name || prev.employeeName
          : prev.employeeName || participantProfile?.name || "",
      position: participantUser ? participantProfile?.role || prev.position : prev.position || participantProfile?.role || "",
      company:
        participantUser?.organizationName ||
        prev.company ||
        enterpriseDefaults.organization.organizationName ||
        "",
      department: participantUser ? participantProfile?.department || prev.department : prev.department || participantProfile?.department || "",
      directManager: participantUser ? participantProfile?.managerName || prev.directManager : prev.directManager || participantProfile?.managerName || "",
      programmeName: prev.programmeName || enterpriseDefaults.program.programName || "",
      reviewPeriod:
        !prev.reviewPeriod || prev.reviewPeriod === "90 days"
          ? enterpriseDefaults.idp.reviewPeriod || "90 days"
          : prev.reviewPeriod,
    }));
    setOrganizationLogo((prev) => prev || enterpriseDefaults.organization.logoUrl || "");
    setDevelopmentFramework(adminFramework);
    setSelectedLeadershipAreas((prev) => ({
      leadingSelf: true,
      leadingTeam: prev.leadingTeam && enterpriseDefaults.idp.leadershipAreas.leadingTeam,
      leadingBusiness: prev.leadingBusiness && enterpriseDefaults.idp.leadershipAreas.leadingBusiness,
    }));
    const allowedApproaches = normalizeSelectedApproaches(enterpriseDefaults.idp.allowedApproaches);
    if (allowedApproaches.length > 0) {
      setSelectedApproaches(allowedApproaches);
      setSelectedMode(derivePrimaryMode(allowedApproaches));
      setSupportingSources(
        Array.from(
          new Set([
            ...filterEvidenceSourcesByConfig(
              deriveEvidenceSourceTypes(allowedApproaches),
              enterpriseDefaults.idp.enabledEvidenceSections
            ),
            ...defaultEvidenceSources,
          ])
        )
      );
    }
    const programDocumentSummary = (enterpriseDefaults.program.documents || [])
      .map((document) => document.extractedText || document.extractedSummary)
      .filter(Boolean)
      .join("\n\n");

    setContextInputs((prev) => ({
      ...prev,
      program: {
        ...prev.program,
        programName: prev.program.programName || enterpriseDefaults.program.programName,
        objectives: prev.program.objectives || enterpriseDefaults.program.objectives,
        moduleThemes: prev.program.moduleThemes || enterpriseDefaults.program.moduleThemes,
        keyCompetencies: prev.program.keyCompetencies || enterpriseDefaults.program.competencies,
        learningSummary: prev.program.learningSummary || programDocumentSummary,
      },
    }));
  }, [draftLoaded, enterpriseDefaults, user]);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        employeeDetails,
        selectedMode,
        selectedApproaches,
        supportingSources,
        selectedLeadershipAreas,
        developmentFramework,
        contextInputs,
        reflections,
        confidenceRatings,
        sourceFiles,
        organizationLogo,
        insights,
        insightsConfirmed,
      })
    );
  }, [
    confidenceRatings,
    contextInputs,
    developmentFramework,
    draftLoaded,
    employeeDetails,
    insights,
    insightsConfirmed,
    organizationLogo,
    reflections,
    selectedApproaches,
    selectedLeadershipAreas,
    selectedMode,
    sourceFiles,
    supportingSources,
  ]);

  useEffect(() => {
    if (window.location.hash !== "#idp-info-tabs") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("idp-info-tabs")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const journeySteps = useMemo(() => {
    const selectedReflectionSteps = reflectionStepDefinitions.filter((step) => selectedLeadershipAreas[step.id]);
    const selfStep = selectedReflectionSteps.find((step) => step.id === "leadingSelf");
    const followUpReflectionSteps = selectedReflectionSteps.filter((step) => step.id !== "leadingSelf");

    return [
      { id: "welcome", title: t("welcomeStepTitle"), shortTitle: t("welcomeStepTitle"), icon: NotebookPen },
      ...(selfStep
        ? [
            {
              id: selfStep.id,
              title: t(selfStep.titleKey),
              shortTitle: t(selfStep.shortTitleKey),
              icon: selfStep.icon,
            },
          ]
        : []),
      { id: "manager", title: t("managerStepTitle"), shortTitle: t("managerStepShort"), icon: MessageSquare },
      ...followUpReflectionSteps.map((step) => ({
        id: step.id,
        title: t(step.titleKey),
        shortTitle: t(step.shortTitleKey),
        icon: step.icon,
      })),
      { id: "generate", title: t("generateStepTitle"), shortTitle: t("generateStepShort"), icon: Sparkles },
    ];
  }, [i18n.language, selectedLeadershipAreas, t]);

  const activeReflectionSteps = useMemo(
    () => reflectionStepDefinitions.filter((step) => selectedLeadershipAreas[step.id]),
    [selectedLeadershipAreas]
  );
  const activeEvidenceSourceTypes = useMemo(
    () =>
      filterEvidenceSourcesByConfig(
        deriveEvidenceSourceTypes(selectedApproaches),
        enterpriseDefaults?.idp.enabledEvidenceSections
      ),
    [enterpriseDefaults?.idp.enabledEvidenceSections, selectedApproaches]
  );
  const activeEvidenceSections = useMemo(
    () => deriveEvidenceSectionsFromSources(activeEvidenceSourceTypes),
    [activeEvidenceSourceTypes]
  );
  const activeSupportingSources = useMemo(
    () => Array.from(new Set([...activeEvidenceSourceTypes, ...defaultEvidenceSources])),
    [activeEvidenceSourceTypes]
  );
  const hasSelfAssessmentInputs = useMemo(
    () =>
      contextInputs.assessments.some(
        (assessment) =>
          assessment.files.length > 0 ||
          Boolean(
            assessment.assessmentType.trim() ||
              assessment.provider.trim() ||
              assessment.assessmentDate.trim() ||
              assessment.summary.trim()
          )
      ),
    [contextInputs.assessments]
  );
  const effectiveSupportingSources = useMemo(
    () =>
      hasSelfAssessmentInputs
        ? Array.from(new Set([...activeSupportingSources, "assessment" as SupportingSourceType]))
        : activeSupportingSources,
    [activeSupportingSources, hasSelfAssessmentInputs]
  );
  const scopedContextInputs = useMemo(
    () => ({
      ...scopeContextInputs(contextInputs, activeEvidenceSections),
      assessments: contextInputs.assessments,
    }),
    [activeEvidenceSections, contextInputs]
  );
  const scopedSourceFiles = useMemo(() => {
    const activeSourceSet = new Set(effectiveSupportingSources);
    return sourceFiles.filter((file) => activeSourceSet.has(file.sourceType));
  }, [effectiveSupportingSources, sourceFiles]);
  const scopedEvidenceFiles = useMemo(() => {
    const evidenceSourceSet = new Set(activeEvidenceSourceTypes);
    return sourceFiles.filter((file) => evidenceSourceSet.has(file.sourceType));
  }, [activeEvidenceSourceTypes, sourceFiles]);
  const hasEvidenceInputs = useMemo(() => {
    const sectionSet = new Set(activeEvidenceSections);
    const hasAssessmentInputs = hasSelfAssessmentInputs;
    const hasProgramInputs =
      sectionSet.has("program") &&
      Boolean(
        contextInputs.program.programName.trim() ||
          contextInputs.program.objectives.trim() ||
          contextInputs.program.moduleThemes.trim() ||
          contextInputs.program.keyCompetencies.trim() ||
          contextInputs.program.facultyCoachNotes.trim() ||
          contextInputs.program.learningSummary.trim() ||
          contextInputs.program.programDocuments.length ||
          contextInputs.program.participantAssignments.length
      );
    const hasRoleInputs =
      sectionSet.has("roleOrganization") &&
      Boolean(
        contextInputs.roleOrganization.futureRoleExpectations.trim() ||
          contextInputs.roleOrganization.successMeasures.trim() ||
          contextInputs.roleOrganization.jobDescriptionFiles.length ||
          contextInputs.roleOrganization.roleDescriptionFiles.length ||
          contextInputs.roleOrganization.competencyFrameworkFiles.length ||
          contextInputs.roleOrganization.organizationLeadershipFrameworkFiles.length ||
          contextInputs.roleOrganization.successProfileFiles.length ||
          contextInputs.roleOrganization.strategicPriorityFiles.length
      );

    return scopedEvidenceFiles.length > 0 || hasAssessmentInputs || hasProgramInputs || hasRoleInputs;
  }, [activeEvidenceSections, contextInputs, hasSelfAssessmentInputs, scopedEvidenceFiles.length]);
  const hasSelfInputs = Boolean(
    contextInputs.participant.careerAspiration.trim() ||
      contextInputs.participant.developmentPriorities.trim() ||
      contextInputs.participant.currentChallenges.trim() ||
      contextInputs.participant.desiredBusinessImpact.trim() ||
      contextInputs.participant.additionalContext.trim()
  );
  const hasManagerInputs = Boolean(
    contextInputs.manager.conversationSummary.trim() ||
      contextInputs.manager.agreedDevelopmentGoals.trim() ||
      contextInputs.manager.strengthsIdentified.trim() ||
      contextInputs.manager.developmentAreasIdentified.trim() ||
      contextInputs.manager.supportExpected.trim() ||
      contextInputs.manager.reviewCadence.trim() ||
      contextInputs.manager.conversationFiles.length
  );
  const progress = useMemo(() => getReflectionProgress(reflections, activeReflectionSteps), [activeReflectionSteps, reflections]);
  const completedReflectionCount = activeReflectionSteps.filter((step) => reflections[step.id]?.trim()).length;
  const canGenerate = Boolean(
      employeeDetails.employeeName.trim() &&
      employeeDetails.company.trim() &&
      selectedApproaches.length > 0 &&
      completedReflectionCount === activeReflectionSteps.length
  );
  useEffect(() => {
    if (currentStepIndex >= journeySteps.length) {
      setCurrentStepIndex(Math.max(0, journeySteps.length - 1));
    }
  }, [currentStepIndex, journeySteps.length]);

  const currentStep = journeySteps[Math.min(currentStepIndex, journeySteps.length - 1)] || journeySteps[0];
  const currentReflectionDefinition = activeReflectionSteps.find((step) => step.id === currentStep.id);
  const isWelcomeStep = currentStep.id === "welcome";
  const isManagerStep = currentStep.id === "manager";
  const isGenerateStep = currentStep.id === "generate";

  const updateEmployee = (field: keyof EmployeeDetails, value: string) => {
    setEmployeeDetails((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "programmeName") {
        setContextInputs((context) => ({
          ...context,
          program: { ...context.program, programName: value },
        }));
      }
      if (field === "aspiration") {
        setContextInputs((context) => ({
          ...context,
          participant: { ...context.participant, careerAspiration: value },
        }));
      }
      return next;
    });
    setInsights([]);
    setInsightsConfirmed(false);
  };

  const handleLanguageChange = (language: LanguageCode) => {
    setSelectedLanguage(language);
    applyLanguagePreference(language, i18n);
  };

  const handleApproachToggle = (mode: IdpMode, checked: boolean) => {
    setSelectedApproaches((prev) => {
      let next: IdpMode[];

      if (mode === "comprehensive") {
        next = checked ? ["comprehensive"] : prev.filter((item) => item !== "comprehensive");
      } else {
        const withoutComprehensive = prev.filter((item) => item !== "comprehensive");
        next = checked
          ? Array.from(new Set([...withoutComprehensive, mode]))
          : withoutComprehensive.filter((item) => item !== mode);
      }

      setSelectedMode(derivePrimaryMode(next));
      setSupportingSources(deriveSupportingSources(next));
      return next;
    });
    setInsightsConfirmed(false);
  };

  const handleLeadershipAreaToggle = (area: LeadershipAreaId, checked: boolean) => {
    if (area === "leadingSelf") return;
    setSelectedLeadershipAreas((prev) => ({ ...prev, [area]: checked }));
    setInsightsConfirmed(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success(t("signedOut", { defaultValue: "Signed out." }));
    setLocation("/");
  };

  const handleFileUpload = (sourceType: SupportingSourceType, target: FileTarget) => async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetKey = `${sourceType}-${target.type}-${"assessmentId" in target ? target.assessmentId : ""}`;
    try {
      for (const file of Array.from(files)) {
        const allowedFileTypes = enterpriseDefaults?.evidence.allowedFileTypes || [
          ".pdf",
          ".doc",
          ".docx",
          ".txt",
          ".md",
          ".csv",
          ".json",
          ".xml",
        ];
        const extension = getFileExtension(file.name);
        if (!extension || !allowedFileTypes.includes(extension)) {
          toast.error(t("unsupportedFileType", { defaultValue: `${file.name}: file type is not allowed by admin configuration.` }));
          continue;
        }
        const maxBytes = (enterpriseDefaults?.evidence.maxFileSizeMb || 25) * 1024 * 1024;
        if (file.size > maxBytes) {
          toast.error(
            t("fileTooLarge", {
              defaultValue: `${file.name}: file exceeds the configured size limit.`,
            })
          );
          continue;
        }
        const hash = await hashFile(file);
        if (sourceFiles.some((existing) => existing.hash === hash)) {
          toast.info(t("duplicateFileSkipped", { name: file.name }));
          continue;
        }

        setUploadingTargets((prev) => ({ ...prev, [targetKey]: 25 }));
        const base64Data = await fileToBase64(file);
        setUploadingTargets((prev) => ({ ...prev, [targetKey]: 65 }));
        const uploaded = await uploadFileMutation.mutateAsync({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          base64Data,
          sourceType,
          fileSize: file.size,
          hash,
        });
        const sourceFile = uploaded as UploadedSourceFile;
        setSourceFiles((prev) => [...prev, sourceFile]);
        setContextInputs((prev) => addFileToContext(prev, target, sourceFile));
        setUploadingTargets((prev) => ({ ...prev, [targetKey]: 100 }));
      }
      setInsights([]);
      setInsightsConfirmed(false);
      toast.success(t("supportingDocumentUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadDocumentError"));
    } finally {
      e.target.value = "";
      window.setTimeout(() => {
        setUploadingTargets((prev) => {
          const next = { ...prev };
          delete next[targetKey];
          return next;
        });
      }, 600);
    }
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("imageFileRequired"));
      return;
    }

    setIsUploadingLogo(true);
    try {
      const hash = await hashFile(file);
      const result = await uploadFileMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        base64Data: await fileToBase64(file),
        sourceType: "other",
        fileSize: file.size,
        hash,
      });
      setOrganizationLogo(result.url || "");
      toast.success(t("logoUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("logoUploadError"));
    } finally {
      setIsUploadingLogo(false);
      e.target.value = "";
    }
  };

  const removeSourceFile = (fileId: string) => {
    setSourceFiles((prev) => prev.filter((file) => file.id !== fileId));
    setContextInputs((prev) => removeFileFromContext(prev, fileId));
    setInsightsConfirmed(false);
  };

  const addAssessment = () => {
    setContextInputs((prev) => ({
      ...prev,
      assessments: [
        ...prev.assessments,
        {
          id: `assessment-${Date.now()}`,
          assessmentType: "",
          provider: "",
          assessmentDate: "",
          summary: "",
          files: [],
        },
      ],
    }));
    setInsights([]);
    setInsightsConfirmed(false);
  };

  const updateAssessment = (assessmentId: string, field: string, value: string) => {
    setContextInputs((prev) => ({
      ...prev,
      assessments: prev.assessments.map((assessment) =>
        assessment.id === assessmentId ? { ...assessment, [field]: value } : assessment
      ),
    }));
    setInsights([]);
    setInsightsConfirmed(false);
  };

  const removeAssessment = (assessmentId: string) => {
    setContextInputs((prev) => ({
      ...prev,
      assessments: prev.assessments.filter((assessment) => assessment.id !== assessmentId),
    }));
    setInsights([]);
    setInsightsConfirmed(false);
  };

  const buildManualInput = () => {
    const confidenceText = activeReflectionSteps
      .map((step) => `${t(step.titleKey)}: ${confidenceRatings[step.id] || t("notRated")}/5`)
      .join("\n");
    const selectedApproachText =
      selectedApproaches.map((mode) => t(idpModeConfig.find((item) => item.id === mode)?.titleKey || "modeProgramTitle")).join(", ") ||
      t("notSpecified");
    const selectedLeadershipText = activeReflectionSteps.map((step) => t(step.titleKey)).join(", ");

    return [
      t("programmeCompletedInput", { programme: employeeDetails.programmeName || t("notSpecified") }),
      t("selectedModeInput", { mode: selectedApproachText }),
      t("supportingSourcesInput", { sources: effectiveSupportingSources.map((source) => getSourceLabel(source, t)).join(", ") || t("notSpecified") }),
      t("leadershipFocusInput", { focus: selectedLeadershipText || t("notSpecified") }),
      t("developmentFrameworkInput", { framework: t(frameworkOptions.find((option) => option.value === developmentFramework)?.labelKey || "frameworkExperiencePeopleLearning") }),
      t("aspirationInput", { aspiration: employeeDetails.aspiration || t("notSpecified") }),
      t("reviewPeriodInput", { period: employeeDetails.reviewPeriod || t("notSpecified") }),
      "",
      t("reflectionInputsHeading"),
      ...activeReflectionSteps.flatMap((step) => ["", `${t(step.titleKey)}:`, reflections[step.id]?.trim() || t("noResponseProvided")]),
      "",
      t("confidenceRatingsHeading"),
      confidenceText,
      "",
      t("preferredOutputLanguage", { language: getLanguageLabel(selectedLanguage) }),
      "",
      t("requestedOutputStyle", { language: getLanguageLabel(selectedLanguage) }),
    ].join("\n");
  };

  const extractInsights = async () => {
    if (!employeeDetails.employeeName.trim() || !employeeDetails.company.trim()) {
      toast.error(t("nameCompanyError"));
      setCurrentStepIndex(0);
      return;
    }

    const result = await extractInsightsMutation.mutateAsync({
      employeeDetails: {
        employeeName: employeeDetails.employeeName,
        position: employeeDetails.position,
        company: employeeDetails.company,
        department: employeeDetails.department,
        yearsOfExperience: parseInt(employeeDetails.yearsOfExperience) || 0,
        dateOfJoining: parseDateInput(employeeDetails.dateOfJoining),
        dateOfIdpCreation: parseDateInput(employeeDetails.dateOfIdpCreation) ?? new Date(),
        directManager: employeeDetails.directManager,
      },
      idpMode: selectedMode,
      supportingSources: effectiveSupportingSources,
      sourceFiles: scopedSourceFiles,
      contextInputs: scopedContextInputs,
      aspiration: employeeDetails.aspiration,
    });
    setInsights(result.insights);
    setInsightsConfirmed(false);
    toast.success(t("insightsExtracted"));
  };

  const confirmInsights = () => {
    const activeInsights = insights.filter((insight) => insight.status === "accepted" || insight.status === "edited");
    if (activeInsights.length === 0) {
      toast.error(t("confirmAtLeastOneInsight"));
      return;
    }
    setInsights(activeInsights.map((insight) => ({ ...insight, userConfirmed: true })));
    setInsightsConfirmed(true);
    toast.success(t("insightsConfirmed"));
  };

  const handleDevelopIdp = async () => {
    if (!employeeDetails.employeeName.trim() || !employeeDetails.company.trim()) {
      toast.error(t("nameCompanyError"));
      setCurrentStepIndex(0);
      return;
    }

    if (!canGenerate) {
      toast.error(t("enterpriseGenerateIncomplete"));
      return;
    }

    setProcessingStatus("processing");
    try {
      const dateOfIdpCreation = parseDateInput(employeeDetails.dateOfIdpCreation) ?? new Date();
      const confirmedInsights = insights
        .filter((insight) => insight.status === "accepted" || insight.status === "edited")
        .map((insight) => ({ ...insight, userConfirmed: true }));

      const result = await generateIdpMutation.mutateAsync({
        employeeDetails: {
          employeeName: employeeDetails.employeeName,
          position: employeeDetails.position,
          company: employeeDetails.company,
          department: employeeDetails.department,
          yearsOfExperience: parseInt(employeeDetails.yearsOfExperience) || 0,
          dateOfJoining: parseDateInput(employeeDetails.dateOfJoining),
          dateOfIdpCreation,
          directManager: employeeDetails.directManager,
        },
        uploadedFiles: scopedSourceFiles,
        sourceFiles: scopedSourceFiles,
        manualInput: buildManualInput(),
        organizationLogo,
        language: selectedLanguage,
        idpMode: selectedMode,
        supportingSources: effectiveSupportingSources,
        contextInputs: scopedContextInputs,
        extractedInsights: insights,
        confirmedInsights,
        developmentFramework,
        organizationConfig: {
          organizationName: enterpriseDefaults?.organization.organizationName || employeeDetails.company,
          organizationLogo: organizationLogo || enterpriseDefaults?.organization.logoUrl,
          brandColors: enterpriseDefaults?.report.useOrganizationBranding
            ? {
                primary: enterpriseDefaults.organization.primaryColor,
                secondary: enterpriseDefaults.organization.secondaryColor,
              }
            : undefined,
          approvedDevelopmentFramework: developmentFramework,
          programObjectives: scopedContextInputs.program.objectives || enterpriseDefaults?.program.objectives,
          competencyFramework: scopedContextInputs.program.keyCompetencies,
          idpOutputTemplate: enterpriseDefaults?.report.template,
          idpReportConfiguration: enterpriseDefaults?.report,
          revisionConfiguration: enterpriseDefaults?.revisions,
        },
        aspiration: employeeDetails.aspiration,
        reviewPeriod: employeeDetails.reviewPeriod,
      });

      localStorage.removeItem(DRAFT_KEY);
      toast.success(t("planGenerated"));
      setLocation(`/idp/${result.id}`);
    } catch (error) {
      toast.error(getGenerationErrorMessage(error, t));
    } finally {
      setProcessingStatus("idle");
    }
  };

  const goNext = async () => {
    if (currentStepIndex < journeySteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
  };

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        employeeDetails,
        selectedMode,
        selectedApproaches,
        supportingSources,
        selectedLeadershipAreas,
        developmentFramework,
        contextInputs,
        reflections,
        confidenceRatings,
        sourceFiles,
        organizationLogo,
        insights,
        insightsConfirmed,
      })
    );
    toast.success(t("draftSaved"));
  };

  const resetDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <button type="button" onClick={() => setCurrentStepIndex(0)} className="flex items-center gap-2 text-left" aria-label="Emeritus">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029322203/HPcFanTDeMMosnOA.png"
              alt="Emeritus"
              className="h-8 w-auto object-contain"
            />
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="gap-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard")}</span>
            </Button>
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              className="gap-2 border-slate-300 text-slate-700 hover:border-emerald-700 hover:text-emerald-800"
            />
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 border-slate-300 p-0 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                aria-label={t("logout", { defaultValue: "Logout" })}
                title={t("logout", { defaultValue: "Logout" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200">
          <div className="container grid gap-10 py-10 lg:grid-cols-[0.9fr_1.35fr] lg:items-start">
            <div className="space-y-8 pt-4">
              <div className="space-y-5">
                <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                  {t("homeHeroTitle")}
                </h1>
                <p className="max-w-xl text-xl leading-8 text-slate-600">{t("homeHeroDescription")}</p>
                <p className="max-w-lg text-base leading-7 text-slate-500">{t("enterpriseHeroSupport")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => setCurrentStepIndex(1)} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
                  {t("startEnterpriseIdp")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2 border-emerald-700 text-emerald-800 hover:bg-emerald-50">
                  <LayoutDashboard className="h-4 w-4" />
                  {t("viewMyDashboard")}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Target, title: t("featureGroundedTitle"), copy: t("featureGroundedCopy") },
                  { icon: ShieldCheck, title: t("featureConfidentialTitle"), copy: t("featureConfidentialCopy") },
                  { icon: CalendarClock, title: t("featureReusableTitle"), copy: t("featureReusableCopy") },
                ].map((item) => (
                  <div key={item.title} className="border-l border-slate-200 pl-4">
                    <item.icon className="mb-3 h-6 w-6 text-emerald-700" />
                    <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="grid min-h-[680px] lg:grid-cols-[230px_1fr]">
                  <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-950">{t("journeyTitle")}</p>
                      <span className="text-xs text-slate-500">{t("progressComplete", { progress })}</span>
                    </div>
                    <div className="space-y-2">
                      {journeySteps.map((step, index) => {
                        const Icon = step.icon;
                        const complete =
                          step.id === "welcome"
                            ? Boolean(employeeDetails.employeeName && employeeDetails.company)
                            : step.id === "manager"
                                  ? hasManagerInputs
                                  : step.id === "generate"
                                    ? canGenerate
                                    : step.id === "leadingSelf"
                                      ? Boolean(reflections[step.id]?.trim() || hasSelfInputs)
                                      : Boolean(reflections[step.id]?.trim());
                        const active = index === currentStepIndex;

                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setCurrentStepIndex(index)}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                              active ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100" : "text-slate-600 hover:bg-white hover:text-slate-950"
                            }`}
                          >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              complete ? "border-emerald-700 bg-emerald-700 text-white" : active ? "border-emerald-700 text-emerald-800" : "border-slate-300 bg-white text-slate-500"
                            }`}>
                              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{step.shortTitle}</span>
                            {active ? <Icon className="h-4 w-4 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <section className="flex min-h-0 flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                        <span className="truncate">{currentStep.title}</span>
                        {!isGenerateStep && <ChevronRight className="h-4 w-4 shrink-0" />}
                        {!isGenerateStep && <span className="hidden truncate text-slate-900 sm:inline">{t("enterpriseJourneyHint")}</span>}
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        <span className="text-xs text-slate-500">{t("progressComplete", { progress })}</span>
                        <Progress value={progress} className="h-2 w-28" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                      {isWelcomeStep && (
                        <WelcomeStep
                          employeeDetails={employeeDetails}
                          organizationLogo={organizationLogo}
                          isUploadingLogo={isUploadingLogo}
                          onInputChange={updateEmployee}
                          onLogoUpload={handleLogoUpload}
                        />
                      )}

                      {currentReflectionDefinition?.id === "leadingSelf" && (
                        <SelfInputsPanel
                          contextInputs={contextInputs}
                          uploadingTargets={uploadingTargets}
                          onContextChange={(next) => {
                            setContextInputs(next);
                            setInsights([]);
                            setInsightsConfirmed(false);
                          }}
                          onFileUpload={handleFileUpload}
                          onRemoveFile={removeSourceFile}
                        />
                      )}

                      {isManagerStep && (
                        <ManagerInputsPanel
                          contextInputs={contextInputs}
                          uploadingTargets={uploadingTargets}
                          onContextChange={(next) => {
                            setContextInputs(next);
                            setInsights([]);
                            setInsightsConfirmed(false);
                          }}
                          onFileUpload={handleFileUpload}
                          onRemoveFile={removeSourceFile}
                        />
                      )}

                      {currentReflectionDefinition && (
                        <>
                          <ReflectionPanel
                            step={currentReflectionDefinition}
                            value={reflections[currentReflectionDefinition.id] || ""}
                            confidence={confidenceRatings[currentReflectionDefinition.id] || 0}
                            onValueChange={(value) => {
                              setReflections((prev) => ({ ...prev, [currentReflectionDefinition.id]: value }));
                              setInsightsConfirmed(false);
                            }}
                            onConfidenceChange={(rating) => setConfidenceRatings((prev) => ({ ...prev, [currentReflectionDefinition.id]: rating }))}
                          />
                        </>
                      )}

                      {isGenerateStep && (
                        <GeneratePanel
                          employeeDetails={employeeDetails}
                          selectedApproaches={selectedApproaches}
                          supportingSources={effectiveSupportingSources}
                          sourceFiles={scopedSourceFiles}
                          insights={insights}
                          completedReflectionCount={completedReflectionCount}
                          totalReflectionCount={activeReflectionSteps.length}
                          canGenerate={canGenerate}
                          processingStatus={processingStatus}
                          onGenerate={handleDevelopIdp}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-[1_1_220px] text-sm leading-5 text-slate-500">{t("enterpriseGenerationNote")}</p>
                        <Button type="button" variant="ghost" size="icon" onClick={saveDraft} className="h-9 w-9 shrink-0 text-emerald-800" title={t("saveDraft")} aria-label={t("saveDraft")}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={resetDraft} className="h-9 w-9 shrink-0 text-slate-500 hover:text-red-700" title={t("clearDraft")} aria-label={t("clearDraft")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                        <Button variant="outline" size="icon" onClick={goBack} disabled={currentStepIndex === 0} className="h-10 w-full min-w-0 border-slate-300 sm:w-10 sm:flex-none" title={t("back")} aria-label={t("back")}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        {isGenerateStep ? (
                          <Button data-testid="generate-idp-action" onClick={handleDevelopIdp} disabled={!canGenerate || processingStatus === "processing"} className="min-w-0 gap-2 bg-emerald-700 whitespace-normal hover:bg-emerald-800 sm:flex-none">
                            {processingStatus === "processing" ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("creatingPlan")}
                              </>
                            ) : (
                              <>
                                {t("generateIDP")}
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button size="icon" onClick={goNext} disabled={extractInsightsMutation.isPending} className="h-10 w-full min-w-0 bg-emerald-700 hover:bg-emerald-800 sm:w-10 sm:flex-none" title={t("next")} aria-label={t("next")}>
                            {extractInsightsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <InfoTabs />

        <section className="container grid gap-8 border-b border-slate-200 py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t("leadershipDimensionsTitle")}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{t("leadershipDimensionsDescription")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: User, title: t("dimensionSelfTitle"), copy: t("dimensionSelfCopy"), tone: "bg-emerald-50 text-emerald-800" },
              { icon: Users, title: t("dimensionTeamTitle"), copy: t("dimensionTeamCopy"), tone: "bg-cyan-50 text-cyan-800" },
              { icon: Building2, title: t("dimensionBusinessTitle"), copy: t("dimensionBusinessCopy"), tone: "bg-amber-50 text-amber-800" },
            ].map((dimension) => (
              <div key={dimension.title} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-md ${dimension.tone}`}>
                  <dimension.icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-950">{dimension.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{dimension.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container py-10">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">{t("homeClosingNote")}</div>
        </section>
      </main>
    </div>
  );
}

function WelcomeStep({
  employeeDetails,
  organizationLogo,
  isUploadingLogo,
  onInputChange,
  onLogoUpload,
}: {
  employeeDetails: EmployeeDetails;
  organizationLogo: string;
  isUploadingLogo: boolean;
  onInputChange: (field: keyof EmployeeDetails, value: string) => void;
  onLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <SectionIntro icon={NotebookPen} title={t("welcomeStepTitle")} description={t("enterpriseWelcomeDescription")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("fieldYourName")} required>
          <Input value={employeeDetails.employeeName} onChange={(e) => onInputChange("employeeName", e.target.value)} placeholder="Aisha Khan" className="border-slate-300" />
        </Field>
        <Field label={t("fieldRole")}>
          <Input value={employeeDetails.position} onChange={(e) => onInputChange("position", e.target.value)} placeholder={t("placeholderRole")} className="border-slate-300" />
        </Field>
        <Field label={t("company")} required>
          <Input value={employeeDetails.company} onChange={(e) => onInputChange("company", e.target.value)} placeholder="Emeritus" className="border-slate-300" />
        </Field>
        <Field label={t("fieldProgrammeCompleted")}>
          <Input value={employeeDetails.programmeName} onChange={(e) => onInputChange("programmeName", e.target.value)} placeholder={t("placeholderProgramme")} className="border-slate-300" />
        </Field>
        <Field label={t("department")}>
          <Input value={employeeDetails.department} onChange={(e) => onInputChange("department", e.target.value)} placeholder={t("placeholderDepartment")} className="border-slate-300" />
        </Field>
        <Field label={t("directManager")}>
          <Input value={employeeDetails.directManager} onChange={(e) => onInputChange("directManager", e.target.value)} placeholder="Rohit Kapoor" className="border-slate-300" />
        </Field>
        <Field label={t("yearsOfExperience")}>
          <Input type="number" value={employeeDetails.yearsOfExperience} onChange={(e) => onInputChange("yearsOfExperience", e.target.value)} placeholder={t("placeholderYears")} className="border-slate-300" />
        </Field>
        <Field label={t("planDate")}>
          <Input type="date" value={employeeDetails.dateOfIdpCreation} onChange={(e) => onInputChange("dateOfIdpCreation", e.target.value)} className="border-slate-300" />
        </Field>
        <Field label={t("dateOfJoining")}>
          <Input type="date" value={employeeDetails.dateOfJoining} onChange={(e) => onInputChange("dateOfJoining", e.target.value)} className="border-slate-300" />
        </Field>
        <Field label={t("reviewPeriod")}>
          <Input value={employeeDetails.reviewPeriod} onChange={(e) => onInputChange("reviewPeriod", e.target.value)} placeholder="90 days" className="border-slate-300" />
        </Field>
        <Field label={t("aspirationOrNextRole")}>
          <Input value={employeeDetails.aspiration} onChange={(e) => onInputChange("aspiration", e.target.value)} placeholder={t("aspirationPlaceholder")} className="border-slate-300" />
        </Field>
        <Field label={t("organizationLogo")}>
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
            <input id="logoUpload" type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
            <label htmlFor="logoUpload" className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
              {organizationLogo ? <img src={organizationLogo} alt={t("organizationLogo")} className="h-9 w-auto object-contain" /> : <Upload className="h-5 w-5 text-slate-500" />}
              <span>{isUploadingLogo ? t("uploadingLogo") : organizationLogo ? t("changeLogo") : t("uploadOptionalLogo")}</span>
            </label>
          </div>
        </Field>
      </div>
    </div>
  );
}

function ApproachStep({
  selectedApproaches,
  selectedLeadershipAreas,
  activeSupportingSources,
  onApproachToggle,
  onLeadershipAreaToggle,
}: {
  selectedApproaches: IdpMode[];
  selectedLeadershipAreas: Record<LeadershipAreaId, boolean>;
  activeSupportingSources: SupportingSourceType[];
  onApproachToggle: (mode: IdpMode, checked: boolean) => void;
  onLeadershipAreaToggle: (area: LeadershipAreaId, checked: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <SectionIntro icon={Target} title={t("buildIdpQuestion")} description={t("buildIdpQuestionDescription")} />
      <div className="grid gap-3">
        {idpModeConfig.map((mode) => {
          const Icon = mode.icon;
          const active = selectedApproaches.includes(mode.id);
          return (
            <label
              key={mode.id}
              className={`w-full cursor-pointer rounded-lg border p-4 text-left transition ${active ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-200"}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={active} onCheckedChange={(checked) => onApproachToggle(mode.id, checked === true)} className="mt-2" />
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{t(mode.titleKey)}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t(mode.descriptionKey)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {mode.bulletKeys.map((key) => (
                  <li key={key} className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">{t("evidenceEnabledTitle")}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("evidenceEnabledDescription")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {activeSupportingSources.length > 0 ? (
            activeSupportingSources.map((source) => (
              <Badge key={source} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                {getSourceLabel(source, t)}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-500">{t("selectAtLeastOneApproach")}</span>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">{t("selectedLeadershipAreasTitle")}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("selectedLeadershipAreasDescription")}</p>
        <div className="mt-4 grid gap-3">
          {reflectionStepDefinitions.map((step) => {
            const Icon = step.icon;
            const locked = step.id === "leadingSelf";
            const checked = locked || selectedLeadershipAreas[step.id];
            return (
              <label key={step.id} className={`flex w-full items-start gap-3 rounded-md border p-3 ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <Checkbox checked={checked} disabled={locked} onCheckedChange={(value) => onLeadershipAreaToggle(step.id, value === true)} className="mt-1" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4 text-emerald-700" />
                    {t(step.titleKey)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {locked ? t("leadingSelfAlwaysIncluded") : t(step.descriptionKey)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EvidenceStep({
  activeSections,
  contextInputs,
  sourceFiles,
  uploadingTargets,
  onContextChange,
  onAddAssessment,
  onUpdateAssessment,
  onRemoveAssessment,
  onFileUpload,
  onRemoveFile,
}: {
  activeSections: EvidenceSectionKey[];
  contextInputs: EnterpriseContextInputs;
  sourceFiles: UploadedSourceFile[];
  uploadingTargets: Record<string, number>;
  onContextChange: (context: EnterpriseContextInputs) => void;
  onAddAssessment: () => void;
  onUpdateAssessment: (assessmentId: string, field: string, value: string) => void;
  onRemoveAssessment: (assessmentId: string) => void;
  onFileUpload: (sourceType: SupportingSourceType, target: FileTarget) => (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
}) {
  const { t } = useTranslation();
  const activeSectionSet = new Set(activeSections);

  const updateProgram = (field: keyof EnterpriseContextInputs["program"], value: string) => {
    onContextChange({ ...contextInputs, program: { ...contextInputs.program, [field]: value } });
  };
  const updateRoleOrg = (field: keyof EnterpriseContextInputs["roleOrganization"], value: string) => {
    onContextChange({ ...contextInputs, roleOrganization: { ...contextInputs.roleOrganization, [field]: value } });
  };
  return (
    <div className="space-y-6">
      <SectionIntro icon={FileText} title={t("contextEvidenceStepTitle")} description={t("contextEvidenceDescription")} />

      {activeSections.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {t("selectAtLeastOneApproach")}
        </div>
      )}

      {activeSectionSet.has("assessment") && (
      <EvidenceSection title={t("assessmentInputsTitle")} description={t("assessmentInputsDescription")}>
        <div className="space-y-4">
          {contextInputs.assessments.map((assessment, index) => (
            <div key={assessment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-950">{t("assessmentNumber", { number: index + 1 })}</h4>
                {contextInputs.assessments.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveAssessment(assessment.id)} className="text-slate-500 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("remove")}
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label={t("assessmentType")}>
                  <Input value={assessment.assessmentType} onChange={(e) => onUpdateAssessment(assessment.id, "assessmentType", e.target.value)} placeholder="Hogan, SHL, OPQ, 360" />
                </Field>
                <Field label={t("assessmentProvider")}>
                  <Input value={assessment.provider} onChange={(e) => onUpdateAssessment(assessment.id, "provider", e.target.value)} placeholder="Provider" />
                </Field>
                <Field label={t("assessmentDate")}>
                  <Input type="date" value={assessment.assessmentDate} onChange={(e) => onUpdateAssessment(assessment.id, "assessmentDate", e.target.value)} />
                </Field>
              </div>
              <TextAreaField label={t("assessmentSummary")} value={assessment.summary} onChange={(value) => onUpdateAssessment(assessment.id, "summary", value)} rows={4} assistContext="assessment" />
              <UploadBox
                id={`assessment-${assessment.id}`}
                label={t("uploadAssessmentReport")}
                files={assessment.files}
                progress={uploadingTargets[`assessment-assessment-${assessment.id}`]}
                onChange={onFileUpload("assessment", { type: "assessment", assessmentId: assessment.id })}
                onRemoveFile={onRemoveFile}
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={onAddAssessment} className="border-slate-300">
            {t("addAssessment")}
          </Button>
        </div>
      </EvidenceSection>
      )}

      {activeSectionSet.has("program") && (
      <EvidenceSection title={t("programInputsTitle")} description={t("programInputsDescription")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("programName")}>
            <Input value={contextInputs.program.programName} onChange={(e) => updateProgram("programName", e.target.value)} />
          </Field>
          <Field label={t("keyCompetenciesAddressed")}>
            <Input value={contextInputs.program.keyCompetencies} onChange={(e) => updateProgram("keyCompetencies", e.target.value)} />
          </Field>
        </div>
        <TextAreaField label={t("programObjectives")} value={contextInputs.program.objectives} onChange={(value) => updateProgram("objectives", value)} rows={4} assistContext="program" />
        <TextAreaField label={t("moduleThemes")} value={contextInputs.program.moduleThemes} onChange={(value) => updateProgram("moduleThemes", value)} rows={4} assistContext="program" />
        <TextAreaField label={t("facultyCoachNotes")} value={contextInputs.program.facultyCoachNotes} onChange={(value) => updateProgram("facultyCoachNotes", value)} rows={4} assistContext="program" />
        <TextAreaField label={t("programLearningSummary")} value={contextInputs.program.learningSummary} onChange={(value) => updateProgram("learningSummary", value)} rows={4} assistContext="program" />
        <div className="grid gap-4 md:grid-cols-2">
          <UploadBox id="program-documents" label={t("uploadProgramDocuments")} files={contextInputs.program.programDocuments} progress={uploadingTargets["program-programDocuments-"]} onChange={onFileUpload("program", { type: "programDocuments" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="participant-assignments" label={t("uploadParticipantAssignments")} files={contextInputs.program.participantAssignments} progress={uploadingTargets["program-participantAssignments-"]} onChange={onFileUpload("program", { type: "participantAssignments" })} onRemoveFile={onRemoveFile} />
        </div>
      </EvidenceSection>
      )}

      {activeSectionSet.has("roleOrganization") && (
      <EvidenceSection title={t("roleOrganizationInputsTitle")} description={t("roleOrganizationInputsDescription")}>
        <div className="grid gap-4 md:grid-cols-2">
          <UploadBox id="job-description" label={t("uploadJobDescription")} files={contextInputs.roleOrganization.jobDescriptionFiles} progress={uploadingTargets["job_description-jobDescriptionFiles-"]} onChange={onFileUpload("job_description", { type: "jobDescriptionFiles" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="role-description" label={t("uploadRoleDescription")} files={contextInputs.roleOrganization.roleDescriptionFiles} progress={uploadingTargets["role_description-roleDescriptionFiles-"]} onChange={onFileUpload("role_description", { type: "roleDescriptionFiles" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="competency-framework" label={t("uploadCompetencyFramework")} files={contextInputs.roleOrganization.competencyFrameworkFiles} progress={uploadingTargets["competency_framework-competencyFrameworkFiles-"]} onChange={onFileUpload("competency_framework", { type: "competencyFrameworkFiles" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="leadership-framework" label={t("uploadLeadershipFramework")} files={contextInputs.roleOrganization.organizationLeadershipFrameworkFiles} progress={uploadingTargets["organization_leadership_framework-organizationLeadershipFrameworkFiles-"]} onChange={onFileUpload("organization_leadership_framework", { type: "organizationLeadershipFrameworkFiles" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="success-profile" label={t("uploadSuccessProfile")} files={contextInputs.roleOrganization.successProfileFiles} progress={uploadingTargets["success_profile-successProfileFiles-"]} onChange={onFileUpload("success_profile", { type: "successProfileFiles" })} onRemoveFile={onRemoveFile} />
          <UploadBox id="strategic-priorities" label={t("uploadStrategicPriorities")} files={contextInputs.roleOrganization.strategicPriorityFiles} progress={uploadingTargets["strategic_priorities-strategicPriorityFiles-"]} onChange={onFileUpload("strategic_priorities", { type: "strategicPriorityFiles" })} onRemoveFile={onRemoveFile} />
        </div>
        <TextAreaField label={t("futureRoleExpectations")} value={contextInputs.roleOrganization.futureRoleExpectations} onChange={(value) => updateRoleOrg("futureRoleExpectations", value)} rows={4} assistContext="role" />
        <TextAreaField label={t("organizationSuccessMeasures")} value={contextInputs.roleOrganization.successMeasures} onChange={(value) => updateRoleOrg("successMeasures", value)} rows={4} assistContext="role" />
      </EvidenceSection>
      )}

      {activeSections.length > 0 && (
      <EvidenceSection title={t("uploadedEvidenceSummary")} description={t("uploadedEvidenceSummaryDescription")}>
        <FileList files={sourceFiles} onRemoveFile={onRemoveFile} />
      </EvidenceSection>
      )}
    </div>
  );
}

function SelfInputsPanel({
  contextInputs,
  uploadingTargets,
  onContextChange,
  onFileUpload,
  onRemoveFile,
}: {
  contextInputs: EnterpriseContextInputs;
  uploadingTargets: Record<string, number>;
  onContextChange: (context: EnterpriseContextInputs) => void;
  onFileUpload: (sourceType: SupportingSourceType, target: FileTarget) => (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
}) {
  const { t } = useTranslation();
  const primaryAssessment = contextInputs.assessments[0] || {
    id: "assessment-1",
    assessmentType: "",
    provider: "",
    assessmentDate: "",
    summary: "",
    files: [],
  };

  const updateParticipant = (field: keyof EnterpriseContextInputs["participant"], value: string) => {
    onContextChange({ ...contextInputs, participant: { ...contextInputs.participant, [field]: value } });
  };

  return (
    <div className="space-y-5">
      <SectionIntro icon={User} title={t("selfInputsTitle")} description={t("selfInputsDescription")} />
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{t("uploadAssessmentReport")}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("assessmentInputsDescription")}</p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {t("sourceAssessment")}
          </Badge>
        </div>
        <UploadBox
          id="self-assessment-upload"
          label={t("uploadAssessmentReport")}
          files={primaryAssessment.files}
          progress={uploadingTargets[`assessment-assessment-${primaryAssessment.id}`]}
          onChange={onFileUpload("assessment", { type: "assessment", assessmentId: primaryAssessment.id })}
          onRemoveFile={onRemoveFile}
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{t("selfInputsTitle")}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("selfInputsDescription")}</p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {t("sourceParticipantGoals")}
          </Badge>
        </div>
        <div className="grid gap-4">
          <TextAreaField label={t("careerAspiration")} value={contextInputs.participant.careerAspiration} onChange={(value) => updateParticipant("careerAspiration", value)} rows={3} assistContext="self" />
          <TextAreaField label={t("developmentPriorities")} value={contextInputs.participant.developmentPriorities} onChange={(value) => updateParticipant("developmentPriorities", value)} rows={3} assistContext="self" />
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label={t("currentChallenges")} value={contextInputs.participant.currentChallenges} onChange={(value) => updateParticipant("currentChallenges", value)} rows={3} assistContext="self" />
            <TextAreaField label={t("desiredBusinessImpact")} value={contextInputs.participant.desiredBusinessImpact} onChange={(value) => updateParticipant("desiredBusinessImpact", value)} rows={3} assistContext="self" />
          </div>
          <TextAreaField label={t("additionalContext")} value={contextInputs.participant.additionalContext} onChange={(value) => updateParticipant("additionalContext", value)} rows={3} assistContext="self" />
        </div>
      </div>
    </div>
  );
}

function ManagerInputsPanel({
  contextInputs,
  uploadingTargets,
  onContextChange,
  onFileUpload,
  onRemoveFile,
}: {
  contextInputs: EnterpriseContextInputs;
  uploadingTargets: Record<string, number>;
  onContextChange: (context: EnterpriseContextInputs) => void;
  onFileUpload: (sourceType: SupportingSourceType, target: FileTarget) => (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
}) {
  const { t } = useTranslation();

  const updateManager = (field: keyof EnterpriseContextInputs["manager"], value: string) => {
    onContextChange({ ...contextInputs, manager: { ...contextInputs.manager, [field]: value } });
  };

  return (
    <div className="space-y-5">
      <SectionIntro icon={MessageSquare} title={t("managerStepTitle")} description={t("managerStepDescription")} />
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{t("managerInputsTitle")}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("managerInputsDescription")}</p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {t("sourceManagerNotes")}
          </Badge>
        </div>
        <UploadBox id="manager-notes" label={t("uploadManagerConversation")} files={contextInputs.manager.conversationFiles} progress={uploadingTargets["manager_notes-managerConversationFiles-"]} onChange={onFileUpload("manager_notes", { type: "managerConversationFiles" })} onRemoveFile={onRemoveFile} />
        <div className="mt-4 grid gap-4">
          <TextAreaField label={t("managerConversationSummary")} value={contextInputs.manager.conversationSummary} onChange={(value) => updateManager("conversationSummary", value)} rows={3} assistContext="manager" />
          <TextAreaField label={t("managerAgreedGoals")} value={contextInputs.manager.agreedDevelopmentGoals} onChange={(value) => updateManager("agreedDevelopmentGoals", value)} rows={3} assistContext="manager" />
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label={t("managerStrengths")} value={contextInputs.manager.strengthsIdentified} onChange={(value) => updateManager("strengthsIdentified", value)} rows={3} assistContext="manager" />
            <TextAreaField label={t("managerDevelopmentAreas")} value={contextInputs.manager.developmentAreasIdentified} onChange={(value) => updateManager("developmentAreasIdentified", value)} rows={3} assistContext="manager" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label={t("managerSupportExpected")} value={contextInputs.manager.supportExpected} onChange={(value) => updateManager("supportExpected", value)} rows={3} assistContext="manager" />
            <TextAreaField label={t("reviewCadence")} value={contextInputs.manager.reviewCadence} onChange={(value) => updateManager("reviewCadence", value)} rows={3} assistContext="manager" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReflectionPanel({
  step,
  value,
  confidence,
  onValueChange,
  onConfidenceChange,
}: {
  step: ReflectionStep;
  value: string;
  confidence: number;
  onValueChange: (value: string) => void;
  onConfidenceChange: (rating: number) => void;
}) {
  const { t } = useTranslation();
  const Icon = step.icon;

  return (
    <div className="space-y-6">
      <SectionIntro icon={Icon} title={t(step.titleKey)} description={t(step.descriptionKey)} />
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-950">{t(step.promptKey)}</h3>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {step.questionKeys.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5 p-5">
          <AssistedTextarea value={value} onChange={onValueChange} placeholder={t("reflectionPlaceholder")} rows={8} maxLength={1600} className="min-h-[190px] text-base leading-7" assistContext="reflection" fieldLabel={t(step.titleKey)} />
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{t("confidenceQuestion")}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} type="button" onClick={() => onConfidenceChange(rating)} className={`rounded p-0.5 ${rating <= confidence ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`} aria-label={t("rateConfidence", { rating })}>
                    <Star className="h-4 w-4 fill-current" />
                  </button>
                ))}
              </div>
              {!confidence && <span className="text-xs text-slate-400">{t("notSureYet")}</span>}
            </div>
            <p className="text-xs text-slate-400">{value.length}/1600</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-950">{t("stepWillGenerate")}</p>
        <p className="mt-1 text-sm text-emerald-800">{t(step.outputKey)}</p>
      </div>
    </div>
  );
}

function InsightsReviewPanel({
  insights,
  isExtracting,
  insightsConfirmed,
  onExtract,
  onInsightsChange,
  onConfirm,
}: {
  insights: ExtractedInsight[];
  isExtracting: boolean;
  insightsConfirmed: boolean;
  onExtract: () => void;
  onInsightsChange: (insights: ExtractedInsight[]) => void;
  onConfirm: () => void;
}) {
  const { t, i18n } = useTranslation();
  const activeLanguage = (i18n.language.split("-")[0] || "en") as LanguageCode;

  const updateInsight = (id: string, patch: Partial<ExtractedInsight>) => {
    onInsightsChange(insights.map((insight) => (insight.id === id ? { ...insight, ...patch } : insight)));
  };

  const addInsight = () => {
    onInsightsChange([
      ...insights,
      {
        id: `manual-${Date.now()}`,
        category: "participant_aspiration",
        text: "",
        sourceType: "participant_goals",
        sourceLabel: getSourceLabel("participant_goals", t),
        confidence: "medium",
        status: "edited",
        userConfirmed: false,
        aiInferred: false,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <SectionIntro icon={ClipboardCheck} title={t("reviewExtractedInputsTitle")} description={t("reviewExtractedInputsDescription")} />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{t("extractionReadiness")}</p>
          <p className="mt-1 text-sm text-slate-600">{t("extractionReadinessDescription")}</p>
        </div>
        <Button type="button" variant="outline" onClick={onExtract} disabled={isExtracting} className="gap-2 border-slate-300">
          {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {insights.length > 0 ? t("refreshInsights") : t("extractInsights")}
        </Button>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          {t("noInsightsYet")}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.id} className={`rounded-lg border p-4 ${insight.status === "removed" ? "border-slate-200 bg-slate-50 opacity-60" : insight.status === "flagged" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">{t(`insightCategory_${insight.category}`)}</Badge>
                  <Badge variant="outline">{getSourceLabel(insight.sourceType, t)}</Badge>
                  <span className="text-xs text-slate-500">{t("confidence")}: {t(insight.confidence)}</span>
                  {insight.aiInferred ? <span className="text-xs text-slate-500">{t("aiInferred")}</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => updateInsight(insight.id, { status: "accepted" })}>{t("accept")}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => updateInsight(insight.id, { status: "flagged" })}>{t("flagInaccurate")}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => updateInsight(insight.id, { status: "removed" })} className="text-slate-500 hover:text-red-700">{t("remove")}</Button>
                </div>
              </div>
              <AssistedTextarea value={translateReportText(insight.text, activeLanguage)} onChange={(value) => updateInsight(insight.id, { text: value, status: "edited" })} rows={3} className="border-slate-300" assistContext="insight" fieldLabel={t(`insightCategory_${insight.category}`)} />
              <Input value={insight.notes || ""} onChange={(e) => updateInsight(insight.id, { notes: e.target.value })} placeholder={t("addContextPlaceholder")} className="mt-3 border-slate-300" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={addInsight} className="border-slate-300">{t("addInsight")}</Button>
        <Button type="button" onClick={onConfirm} disabled={insights.length === 0} className="bg-emerald-700 hover:bg-emerald-800">
          {insightsConfirmed ? t("insightsConfirmed") : t("confirmInsights")}
        </Button>
      </div>
    </div>
  );
}

function GeneratePanel({
  employeeDetails,
  selectedApproaches,
  supportingSources,
  sourceFiles,
  insights,
  completedReflectionCount,
  totalReflectionCount,
  canGenerate,
  processingStatus,
  onGenerate,
}: {
  employeeDetails: EmployeeDetails;
  selectedApproaches: IdpMode[];
  supportingSources: SupportingSourceType[];
  sourceFiles: UploadedSourceFile[];
  insights: ExtractedInsight[];
  completedReflectionCount: number;
  totalReflectionCount: number;
  canGenerate: boolean;
  processingStatus: "idle" | "processing";
  onGenerate: () => void;
}) {
  const { t } = useTranslation();
  const activeInsightCount = insights.filter((insight) => insight.status === "accepted" || insight.status === "edited").length;

  return (
    <div className="space-y-6">
      <SectionIntro icon={Sparkles} title={t("generatePanelTitle")} description={t("enterpriseGeneratePanelDescription")} />
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryTile label={t("learner")} value={employeeDetails.employeeName || t("notAdded")} />
        <SummaryTile label={t("company")} value={employeeDetails.company || t("notAdded")} />
        <SummaryTile label={t("supportingSourcesTitle")} value={String(supportingSources.length)} />
        <SummaryTile label={t("supportingFiles")} value={t("uploadedCount", { count: sourceFiles.length })} />
        <SummaryTile label={t("confirmedInsights")} value={activeInsightCount > 0 ? String(activeInsightCount) : t("autoSynthesized", { defaultValue: "Auto-synthesized" })} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">{t("readinessChecklist")}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReadinessItem complete={Boolean(employeeDetails.employeeName && employeeDetails.company)} label={t("profileReady")} />
          <ReadinessItem complete={selectedApproaches.length > 0} label={t("sourceContextReady", { defaultValue: "Source context is configured" })} />
          <ReadinessItem complete={completedReflectionCount === totalReflectionCount} label={t("reflectionReady")} />
          <ReadinessItem complete label={t("aiWillSynthesizeInputs", { defaultValue: "AI will synthesize inputs and documents" })} />
        </div>
      </div>
      {!canGenerate && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("enterpriseGenerateIncomplete")}</div>}
      <Button type="button" onClick={onGenerate} disabled={!canGenerate || processingStatus === "processing"} className="w-full gap-2 bg-emerald-700 hover:bg-emerald-800">
        {processingStatus === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {processingStatus === "processing" ? t("creatingPlan") : t("generateIDP")}
      </Button>
    </div>
  );
}

function InfoTabs() {
  const { t } = useTranslation();

  return (
    <section id="idp-info-tabs" data-testid="idp-info-tabs" className="scroll-mt-24 border-b border-slate-200 bg-white">
      <div className="container py-10">
        <Tabs defaultValue="what" className="gap-3">
          <TabsList className="grid h-auto w-full grid-cols-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
            <TabsTrigger value="what" className="h-9 gap-2 rounded-md text-sm font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" />
              {t("idpOverviewTab")}
            </TabsTrigger>
            <TabsTrigger value="benefit" className="h-9 gap-2 rounded-md text-sm font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              {t("idpBenefitTab")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="what" className="mt-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("idpOverviewTab")}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{t("idpInfoExpandedTitle")}</h2>
            <div className="mt-4 max-w-5xl space-y-4 text-base leading-7 text-slate-600">
              <p>{t("idpInfoExpandedParagraph1")}</p>
              <p>{t("idpInfoExpandedParagraph2")}</p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                { title: t("selfAssessment"), copy: t("idpSelfAssessmentCopy") },
                { title: t("goalSetting"), copy: t("idpGoalSettingCopy") },
                { title: t("idpActionPlanningTitle"), copy: t("idpActionPlanningCopy") },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-5">
                  <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="benefit" className="mt-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("idpBenefitTab")}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{t("idpBenefitSectionTitle")}</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
              {[
                { title: t("employeeBenefitsTitle"), items: [t("employeeBenefit1"), t("employeeBenefit2"), t("employeeBenefit3"), t("employeeBenefit4")] },
                { title: t("organisationBenefitsTitle"), items: [t("organisationBenefit1"), t("organisationBenefit2"), t("organisationBenefit3"), t("organisationBenefit4")] },
              ].map((group) => (
                <div key={group.title} className="rounded-lg border border-slate-200 bg-slate-50/60 p-5">
                  <h3 className="text-base font-semibold text-slate-950">{group.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function SectionIntro({ icon: Icon, title, description }: { icon: typeof User; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function EvidenceSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}

function UploadBox({
  id,
  label,
  files,
  progress,
  onChange,
  onRemoveFile,
  accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.json,.xml,.xlsx",
}: {
  id: string;
  label: string;
  files: UploadedSourceFile[];
  progress?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
  accept?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <input type="file" id={id} multiple accept={accept} onChange={onChange} className="hidden" />
      <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-600">
        <span className="flex min-w-0 items-center gap-2">
          {progress !== undefined && progress < 100 ? <Loader2 className="h-4 w-4 animate-spin text-emerald-700" /> : <Upload className="h-4 w-4 text-slate-500" />}
          <span className="truncate font-medium text-slate-700">{label}</span>
        </span>
        <span className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{progress !== undefined && progress < 100 ? t("uploading") : t("upload")}</span>
      </label>
      {progress !== undefined && <Progress value={progress} className="mt-3 h-2" />}
      <FileList files={files} onRemoveFile={onRemoveFile} compact />
    </div>
  );
}

function FileList({ files, onRemoveFile, compact }: { files: UploadedSourceFile[]; onRemoveFile: (fileId: string) => void; compact?: boolean }) {
  const { t } = useTranslation();
  if (files.length === 0) {
    return compact ? null : <p className="text-sm text-slate-500">{t("noFilesUploaded")}</p>;
  }

  return (
    <div className={compact ? "mt-3 space-y-2" : "space-y-2"}>
      {files.map((file) => (
        <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-500">{getSourceLabel(file.sourceType, t)} - {file.mimeType || "file"} - {fileSizeLabel(file.size || 0)} - {t(`fileStatus_${file.status}`)}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveFile(file.id)} className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-700" title={t("remove")} aria-label={t("remove")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

type TextAssistContext = "general" | "assessment" | "program" | "role" | "self" | "manager" | "reflection" | "insight";
type TextAssistAction = "improve" | "examples" | "specific" | "evidence" | "structure" | "impact";

const textAssistActionConfig: Record<TextAssistAction, { labelKey: string; textKey: string; icon: typeof Sparkles }> = {
  improve: { labelKey: "fieldAssistImprove", textKey: "fieldAssistImproveText", icon: Sparkles },
  examples: { labelKey: "fieldAssistExamples", textKey: "fieldAssistExamplesText", icon: Lightbulb },
  specific: { labelKey: "fieldAssistSpecific", textKey: "assistMakeSpecificText", icon: Target },
  evidence: { labelKey: "fieldAssistEvidence", textKey: "assistEvidenceText", icon: ClipboardCheck },
  structure: { labelKey: "fieldAssistStructure", textKey: "fieldAssistStructureText", icon: NotebookPen },
  impact: { labelKey: "fieldAssistImpact", textKey: "fieldAssistImpactText", icon: Target },
};

function getTextAssistActions(context: TextAssistContext): TextAssistAction[] {
  if (context === "self") return ["improve", "examples", "specific", "impact"];
  if (context === "manager") return ["structure", "specific", "evidence", "impact"];
  if (context === "assessment" || context === "insight") return ["structure", "specific", "evidence"];
  if (context === "program" || context === "role") return ["structure", "examples", "specific", "evidence"];
  if (context === "reflection") return ["improve", "examples", "specific", "evidence"];
  return ["improve", "examples", "specific", "evidence"];
}

function getFieldAssistText({
  action,
  context,
  fieldLabel,
  translate,
}: {
  action: TextAssistAction;
  context: TextAssistContext;
  fieldLabel?: string;
  translate: (key: string) => string;
}) {
  const header = fieldLabel ? `${fieldLabel}:\n` : "";
  const actionText = translate(textAssistActionConfig[action].textKey);
  const contextText =
    context === "assessment"
      ? `${translate("fieldAssistStructureText")}\n${translate("assistEvidenceText")}`
      : context === "manager"
        ? `${translate("fieldAssistStructureText")}\n${translate("fieldAssistImpactText")}`
        : context === "program"
          ? `${translate("fieldAssistStructureText")}\n${translate("fieldAssistExamplesText")}`
          : context === "role"
            ? `${translate("assistMakeSpecificText")}\n${translate("assistEvidenceText")}`
            : context === "self"
              ? `${translate("fieldAssistImproveText")}\n${translate("fieldAssistImpactText")}`
              : context === "reflection"
                ? `${translate("fieldAssistExamplesText")}\n${translate("assistEvidenceText")}`
                : context === "insight"
                  ? `${translate("assistEvidenceText")}\n${translate("assistMakeSpecificText")}`
                  : translate("fieldAssistStructureText");

  return `${header}${actionText}\n${contextText}`;
}

function appendAssistedText(currentValue: string, text: string) {
  const current = currentValue.trim();
  return current ? `${current}\n\n${text}` : text;
}

function AssistedTextarea({
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  className = "",
  assistContext = "general",
  fieldLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  assistContext?: TextAssistContext;
  fieldLabel?: string;
}) {
  const { t } = useTranslation();
  const actions = getTextAssistActions(assistContext);

  const applyAssist = (action: TextAssistAction) => {
    onChange(appendAssistedText(value, getFieldAssistText({ action, context: assistContext, fieldLabel, translate: t })));
    toast.success(t("fieldAssistApplied"));
  };

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`resize-none border-slate-300 pr-12 leading-6 ${className}`}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
            title={t("assistThisField")}
            aria-label={t("assistThisField")}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
          {actions.map((action) => {
            const config = textAssistActionConfig[action];
            const Icon = config.icon;
            return (
              <DropdownMenuItem key={action} onSelect={() => applyAssist(action)} className="cursor-pointer">
                <Icon className="h-4 w-4" />
                {t(config.labelKey)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  assistContext = "general",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  assistContext?: TextAssistContext;
}) {
  return (
    <Field label={label}>
      <AssistedTextarea value={value} onChange={onChange} rows={rows} assistContext={assistContext} fieldLabel={label} />
    </Field>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ReadinessItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${complete ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-400"}`}>
        {complete ? <Check className="h-4 w-4" /> : <NotebookPen className="h-4 w-4" />}
      </span>
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </div>
  );
}
