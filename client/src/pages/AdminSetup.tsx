import { useEffect, useMemo, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  KeyRound,
  LibraryBig,
  Loader2,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector, {
  applyLanguagePreference,
  getStoredOutputLanguage,
  languageOptions,
  type LanguageCode,
} from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription as UiCardDescription,
  CardHeader,
  CardTitle as UiCardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAutoTranslatedText } from "@/lib/useAutoTranslatedText";
import {
  adminAllowedFileTypeOptions,
  adminApproachOptions,
  adminEvidenceSectionOptions,
  adminReportSectionOptions,
  adminRequiredFieldOptions,
  adminRevisionSectionOptions,
  createDefaultAdminConfiguration,
  normalizeAdminConfiguration,
  type AdminCompanyDocument,
  type AdminConfiguration,
  type AdminProgramDocument,
  type AdminParticipant,
  type EvidenceReviewStatus,
  type Framework702010Mode,
  type CompanyDocumentCategory,
  type CompanyDocumentConfidentiality,
  type CompanyDocumentReviewStatus,
  type OrganizationSetup,
  type ProgramDocumentType,
  type ProgramDocumentReviewStatus,
} from "@shared/adminConfig";
import type { SupportingSourceType } from "@shared/idpEnterprise";

const approachLabels: Record<string, string> = {
  assessment_based: "Assessment-Based IDP",
  program_based: "Program-Based IDP",
  role_based: "Role-Based IDP",
};

const evidenceLabels: Record<SupportingSourceType, string> = {
  assessment: "Assessment reports",
  program: "Program inputs",
  job_description: "Job description",
  role_description: "Role description",
  competency_framework: "Competency framework",
  organization_leadership_framework: "Leadership framework",
  success_profile: "Success profile",
  strategic_priorities: "Strategic priorities",
  manager_notes: "Manager notes",
  participant_goals: "Self goals",
  organization_goals: "Organization goals",
  other: "Other",
};

const requiredFieldLabels: Record<string, string> = {
  employeeName: "Participant name",
  position: "Role / position",
  company: "Organization",
  department: "Department",
  directManager: "Direct manager",
  aspiration: "Aspiration or next role",
  reviewPeriod: "Review period",
  selectedApproach: "Selected IDP approach",
  confirmedInsights: "Confirmed extracted insights",
};

const reviewStatusLabels: Record<EvidenceReviewStatus, string> = {
  not_configured: "Not configured",
  draft: "Draft controls",
  review_required: "Evidence review required",
  ready: "Ready for launch",
};

const reportSectionLabels: Record<keyof AdminConfiguration["report"]["enabledSections"], string> = {
  purposeGuidance: "Purpose and participant guidance",
  executiveSummary: "Executive summary",
  employeeInformation: "Employee information",
  leadershipContext: "Participant leadership context and aspirations",
  growThinkExecuteInspireAssessment: "Baseline GROW-THINK-EXECUTE-INSPIRE self-assessment",
  evidenceSummary: "Evidence summary",
  strengthsAndGaps: "Strengths and gaps",
  goalSettingCanvas: "Development goal-setting canvas",
  developmentPriorities: "Development priorities",
  actionPlan: "30-60-90 action plan",
  hitachiChallenge: "One Hitachi Group Challenge leadership application",
  masterclassReflectionJournal: "Masterclass and MIT xPRO reflection journal",
  midpointPeerFeedback: "Midpoint review and peer learning-circle feedback",
  evidenceImpactTracker: "Evidence-of-change and impact tracker",
  finalIntegratedReflection: "Final integrated reflection",
  personalLeadershipCommitment: "Personal leadership commitment",
  seniorLeaderWitness: "Senior-leader witness section",
  continuationPlan: "Optional 30/60/90-day continuation plan",
  growModel: "GROW model",
  managerGuide: "Manager discussion guide",
  progressTracking: "Progress tracking",
  learningRecommendations: "Learning recommendations",
  signatures: "Employee and manager signatures",
};

const revisionSectionLabels: Record<string, string> = {
  participantProfile: "Participant profile",
  confirmedInsights: "Confirmed insights",
  developmentPriorities: "Development priorities",
  actionsAndMilestones: "Actions and milestones",
  managerGuide: "Manager guide",
  progressUpdates: "Progress updates",
  learningRecommendations: "Learning recommendations",
};

const programDocumentTypeLabels: Record<ProgramDocumentType, string> = {
  program_brochure: "Program brochure",
  ppt_deck: "PPT / slide deck",
  objectives_document: "Objectives document",
  other: "Other program document",
};

const programDocumentReviewLabels: Record<ProgramDocumentReviewStatus, string> = {
  needs_review: "Needs verification",
  verified: "Verified",
};

const companyDocumentCategoryLabels: Record<CompanyDocumentCategory, string> = {
  strategy_business_priorities: "Strategy & business priorities",
  leadership_competency_framework: "Leadership & competency framework",
  culture_values: "Culture & values",
  organization_structure: "Organization structure",
  role_job_description: "Role / job description",
  role_career_architecture: "Role family & career architecture",
  success_profile: "Success profile",
  digital_ai_sustainability: "Digital, AI & sustainability",
  policy_other: "Policy or other company document",
};

const companyDocumentReviewLabels: Record<CompanyDocumentReviewStatus, string> = {
  needs_review: "Needs review",
  approved: "Approved for IDP use",
  superseded: "Superseded",
  expired: "Expired",
};

const companyDocumentConfidentialityLabels: Record<CompanyDocumentConfidentiality, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
};

const reportTemplateLabels: Record<AdminConfiguration["report"]["template"], string> = {
  standard: "Standard IDP report",
  executive: "Executive-ready summary",
  manager_review: "Manager review pack",
  custom: "Custom template",
};

const adminTabValues = [
  "organization",
  "participants",
  "program",
  "company-knowledge",
  "idp",
  "evidence",
  "report",
] as const;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function parseBulkParticipants(value: string, organizationId: string): AdminParticipant[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^name\s*,\s*email\s*,\s*role\s*,\s*department\s*,\s*manager/i.test(line))
    .map((line) => {
      const [name = "", email = "", role = "", department = "", managerName = ""] = line
        .split(",")
        .map((part) => part.trim());
      return {
        id: createId("participant"),
        organizationId,
        name,
        email,
        generatedPassword: generateTemporaryPassword(),
        role,
        department,
        managerName,
        status: "invited" as const,
        addedAt: new Date().toISOString(),
      };
    })
    .filter((participant) => participant.name || participant.email);
}

function inferProgramDocumentType(file: File): ProgramDocumentType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ppt") || name.endsWith(".pptx") || name.includes("deck")) return "ppt_deck";
  if (name.includes("brochure") || name.includes("prospectus")) return "program_brochure";
  if (name.includes("objective") || name.includes("syllabus")) return "objectives_document";
  return "other";
}

function readableProgramName(file: File) {
  return file.name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readSectionFromText(text: string, labels: string[]) {
  const normalizedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const sectionPattern = new RegExp(
    `(?:^|\\n)\\s*(?:${normalizedLabels.join("|")})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:objectives?|module themes?|modules?|competenc(?:y|ies)|skills?|outcomes?)\\s*:?|$)`,
    "i"
  );
  return text.match(sectionPattern)?.[1]?.trim().slice(0, 1200) || "";
}

async function createProgramDocument(file: File): Promise<AdminProgramDocument> {
  const documentType = inferProgramDocumentType(file);
  const isTextLike =
    file.type.startsWith("text/") ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".md") ||
    file.name.toLowerCase().endsWith(".csv");
  const text = isTextLike ? await file.text() : "";
  const extractedFields = {
    programName: readableProgramName(file),
    objectives: text ? readSectionFromText(text, ["objectives?", "outcomes?"]) : "",
    moduleThemes: text ? readSectionFromText(text, ["module themes?", "modules?"]) : "",
    competencies: text ? readSectionFromText(text, ["competenc(?:y|ies)", "skills?"]) : "",
  };

  return {
    id: createId("program-document"),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: "pending_review",
    documentType,
    reviewStatus: "needs_review",
    extractedFields,
    extractedSummary: text
      ? text.slice(0, 700)
      : `${programDocumentTypeLabels[documentType]} added for admin verification. Content extraction for binary files can be connected later without changing this setup flow.`,
  };
}

const companyCategorySourceTypes: Record<CompanyDocumentCategory, SupportingSourceType> = {
  strategy_business_priorities: "strategic_priorities",
  leadership_competency_framework: "organization_leadership_framework",
  culture_values: "strategic_priorities",
  organization_structure: "strategic_priorities",
  role_job_description: "job_description",
  role_career_architecture: "role_description",
  success_profile: "success_profile",
  digital_ai_sustainability: "strategic_priorities",
  policy_other: "strategic_priorities",
};

function inferCompanyDocumentCategory(file: File): CompanyDocumentCategory {
  const name = file.name.toLowerCase();
  if (name.includes("job description") || name.includes("role description") || name.includes("jd")) {
    return "role_job_description";
  }
  if (name.includes("competenc") || name.includes("leadership framework")) {
    return "leadership_competency_framework";
  }
  if (name.includes("success profile")) return "success_profile";
  if (name.includes("career") || name.includes("role architecture")) return "role_career_architecture";
  if (name.includes("culture") || name.includes("values")) return "culture_values";
  if (name.includes("organization") || name.includes("organisation") || name.includes("structure")) {
    return "organization_structure";
  }
  if (name.includes("digital") || name.includes("ai") || name.includes("sustainability")) {
    return "digital_ai_sustainability";
  }
  if (name.includes("strategy") || name.includes("annual report") || name.includes("priority")) {
    return "strategy_business_priorities";
  }
  return "policy_other";
}

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

export default function AdminSetup() {
  const { t, i18n } = useTranslation();
  const tx = useAutoTranslatedText();
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => getStoredOutputLanguage());
  const [activeTab, setActiveTab] = useState("organization");
  const [config, setConfig] = useState<AdminConfiguration | null>(null);
  const [pendingOrganization, setPendingOrganization] = useState<OrganizationSetup | null>(null);
  const [participantOrganizationId, setParticipantOrganizationId] = useState("");
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    email: "",
    generatedPassword: generateTemporaryPassword(),
    role: "",
    department: "",
    managerName: "",
  });
  const [bulkParticipants, setBulkParticipants] = useState("");
  const [providerInput, setProviderInput] = useState("");
  const [programDocumentType, setProgramDocumentType] = useState<ProgramDocumentType>("program_brochure");
  const { data, isLoading } = trpc.admin.getEnterpriseConfig.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const saveMutation = trpc.admin.saveEnterpriseConfig.useMutation({
    onSuccess: (savedConfig) => {
      setConfig(savedConfig);
      utils.admin.getEnterpriseConfig.invalidate();
      utils.idp.getEnterpriseDefaults.invalidate();
      toast.success(tx("Admin setup saved."));
    },
    onError: (error) => toast.error(error.message || tx("Unable to save admin setup.")),
  });
  const uploadFileMutation = trpc.idp.uploadFile.useMutation();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [authLoading, setLocation, user]);

  useEffect(() => {
    if (data) setConfig(normalizeAdminConfiguration(data));
  }, [data]);

  useEffect(() => {
    const syncTabFromHash = () => {
      const hashTab = window.location.hash.replace("#", "");
      if (adminTabValues.includes(hashTab as (typeof adminTabValues)[number])) {
        setActiveTab(hashTab);
      }
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  useEffect(() => {
    if (adminTabValues.includes(activeTab as (typeof adminTabValues)[number]) && window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, "", `#${activeTab}`);
    }
  }, [activeTab]);

  const normalizedConfig = useMemo(
    () => normalizeAdminConfiguration(config || createDefaultAdminConfiguration()),
    [config]
  );

  useEffect(() => {
    if (!config) return;
    const selectedId = normalizedConfig.selectedOrganizationId;
    const hasParticipantOrganization = normalizedConfig.organizations.some(
      (organization) => organization.id === participantOrganizationId
    );
    if (!participantOrganizationId || !hasParticipantOrganization) {
      setParticipantOrganizationId(selectedId);
    }
  }, [config, normalizedConfig, participantOrganizationId]);

  const handleLanguageChange = (language: LanguageCode) => {
    setSelectedLanguage(language);
    applyLanguagePreference(language, i18n);
  };

  const handleLogout = async () => {
    await logout();
    toast.success(tx("Signed out."));
    setLocation("/");
  };

  if (authLoading || isLoading || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {tx("Loading admin setup...")}
      </div>
    );
  }

  const selectedOrganization =
    normalizedConfig.organizations.find((organization) => organization.id === normalizedConfig.selectedOrganizationId) ||
    normalizedConfig.organization;
  const participantOrganization =
    normalizedConfig.organizations.find((organization) => organization.id === participantOrganizationId) ||
    selectedOrganization;
  const organizationParticipants = normalizedConfig.participants.filter(
    (participant) => participant.organizationId === participantOrganization.id
  );
  const organizationCompanyDocuments = normalizedConfig.companyKnowledge.documents.filter(
    (document) => document.organizationId === selectedOrganization.id
  );

  const updateConfig = (next: AdminConfiguration) => setConfig(normalizeAdminConfiguration(next));

  const updateOrganization = (patch: Partial<AdminConfiguration["organization"]>) => {
    const updatedOrganization = { ...selectedOrganization, ...patch };
    updateConfig({
      ...normalizedConfig,
      organization: updatedOrganization,
      selectedOrganizationId: updatedOrganization.id,
      organizations: normalizedConfig.organizations.map((organization) =>
        organization.id === updatedOrganization.id ? updatedOrganization : organization
      ),
    });
  };

  const uploadOrganizationLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(tx("Upload an image file for the logo."));
      event.target.value = "";
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      const uploaded = await uploadFileMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        base64Data,
        sourceType: "other",
        fileSize: file.size,
        hash: await hashFile(file),
      });
      updateOrganization({ logoUrl: uploaded.url || `data:${file.type};base64,${base64Data}` });
      toast.success(tx("Organization logo uploaded. Press Save setup to persist it."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Unable to upload logo."));
    } finally {
      event.target.value = "";
    }
  };

  const selectOrganization = (organizationId: string) => {
    const organization = normalizedConfig.organizations.find((item) => item.id === organizationId);
    if (!organization) return;
    updateConfig({
      ...normalizedConfig,
      organization,
      selectedOrganizationId: organization.id,
    });
  };

  const addOrganization = () => {
    const baseOrganization = createDefaultAdminConfiguration().organization;
    setPendingOrganization({
      ...baseOrganization,
      id: createId("organization"),
      organizationName: "",
      region: "Global",
    });
    setActiveTab("organization");
  };

  const savePendingOrganization = () => {
    if (!pendingOrganization?.organizationName.trim()) {
      toast.error(tx("Add an organization name before saving it."));
      return;
    }

    const organization = {
      ...pendingOrganization,
      organizationName: pendingOrganization.organizationName.trim(),
    };
    updateConfig({
      ...normalizedConfig,
      organization,
      organizations: [...normalizedConfig.organizations, organization],
      selectedOrganizationId: organization.id,
    });
    setParticipantOrganizationId(organization.id);
    setPendingOrganization(null);
    setActiveTab("organization");
    toast.success(tx("Organization added to setup. Press Save setup to persist it."));
  };

  const removeOrganization = (organizationId: string) => {
    if (normalizedConfig.organizations.length <= 1) {
      toast.error(tx("At least one organization is required."));
      return;
    }

    const nextOrganizations = normalizedConfig.organizations.filter((organization) => organization.id !== organizationId);
    const nextSelectedOrganization = nextOrganizations[0];
    updateConfig({
      ...normalizedConfig,
      organization: nextSelectedOrganization,
      organizations: nextOrganizations,
      selectedOrganizationId: nextSelectedOrganization.id,
      participants: normalizedConfig.participants.filter((participant) => participant.organizationId !== organizationId),
      companyKnowledge: {
        ...normalizedConfig.companyKnowledge,
        documents: normalizedConfig.companyKnowledge.documents.filter(
          (document) => document.organizationId !== organizationId
        ),
      },
    });
    toast.success(tx("Organization removed. Its participant assignments were removed from setup."));
  };

  const updateProgram = (patch: Partial<AdminConfiguration["program"]>) => {
    updateConfig({ ...normalizedConfig, program: { ...normalizedConfig.program, ...patch } });
  };

  const updateCompanyKnowledge = (patch: Partial<AdminConfiguration["companyKnowledge"]>) => {
    updateConfig({
      ...normalizedConfig,
      companyKnowledge: { ...normalizedConfig.companyKnowledge, ...patch },
    });
  };

  const updateIdp = (patch: Partial<AdminConfiguration["idp"]>) => {
    updateConfig({ ...normalizedConfig, idp: { ...normalizedConfig.idp, ...patch } });
  };

  const updateEvidence = (patch: Partial<AdminConfiguration["evidence"]>) => {
    updateConfig({ ...normalizedConfig, evidence: { ...normalizedConfig.evidence, ...patch } });
  };

  const toggleApproach = (approach: AdminConfiguration["idp"]["allowedApproaches"][number]) => {
    const current = normalizedConfig.idp.allowedApproaches;
    const next = current.includes(approach)
      ? current.filter((item) => item !== approach)
      : [...current, approach];
    updateIdp({ allowedApproaches: next.length ? next : current });
  };

  const toggleEvidenceSection = (source: SupportingSourceType) => {
    const current = normalizedConfig.idp.enabledEvidenceSections;
    updateIdp({
      enabledEvidenceSections: current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    });
  };

  const toggleRequiredField = (field: string) => {
    const current = normalizedConfig.idp.requiredFields;
    updateIdp({
      requiredFields: current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    });
  };

  const toggleRequiredEvidence = (source: SupportingSourceType) => {
    const current = normalizedConfig.evidence.requiredEvidenceByProgram;
    updateEvidence({
      requiredEvidenceByProgram: current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    });
  };

  const toggleFileType = (fileType: string) => {
    const current = normalizedConfig.evidence.allowedFileTypes;
    updateEvidence({
      allowedFileTypes: current.includes(fileType)
        ? current.filter((item) => item !== fileType)
        : [...current, fileType],
    });
  };

  const addParticipant = () => {
    if (!newParticipant.name.trim() && !newParticipant.email.trim()) {
      toast.error(tx("Add at least a participant name or email."));
      return;
    }

    updateConfig({
      ...normalizedConfig,
      participants: [
        ...normalizedConfig.participants,
        {
          id: createId("participant"),
          organizationId: participantOrganization.id,
          ...newParticipant,
          generatedPassword: newParticipant.generatedPassword || generateTemporaryPassword(),
          status: "invited",
          addedAt: new Date().toISOString(),
        },
      ],
    });
    setNewParticipant({ name: "", email: "", generatedPassword: generateTemporaryPassword(), role: "", department: "", managerName: "" });
    toast.success(`${tx("Participant added to")} ${participantOrganization.organizationName}.`);
  };

  const downloadParticipantTemplate = () => {
    const csv = [
      "name,email,role,department,manager",
      "Asha Rao,asha@example.com,Regional Manager,Operations,Dev Mehta",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "idp-participant-upload-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importParticipants = () => {
    const parsed = parseBulkParticipants(bulkParticipants, participantOrganization.id);
    if (!parsed.length) {
      toast.error(tx("Paste at least one participant row."));
      return;
    }
    updateConfig({ ...normalizedConfig, participants: [...normalizedConfig.participants, ...parsed] });
    setBulkParticipants("");
    toast.success(`${parsed.length} ${tx(parsed.length === 1 ? "participant imported into" : "participants imported into")} ${participantOrganization.organizationName}.`);
  };

  const importParticipantFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseBulkParticipants(text, participantOrganization.id);
    if (!parsed.length) {
      toast.error(tx("No participant rows found in that file."));
      event.target.value = "";
      return;
    }

    updateConfig({ ...normalizedConfig, participants: [...normalizedConfig.participants, ...parsed] });
    event.target.value = "";
    toast.success(`${parsed.length} ${tx(parsed.length === 1 ? "participant uploaded into" : "participants uploaded into")} ${participantOrganization.organizationName}.`);
  };

  const removeParticipant = (participantId: string) => {
    updateConfig({
      ...normalizedConfig,
      participants: normalizedConfig.participants.filter(
        (participant) => !(participant.id === participantId && participant.organizationId === participantOrganization.id)
      ),
    });
  };

  const addProvider = () => {
    const provider = providerInput.trim();
    if (!provider) return;
    updateEvidence({
      assessmentProviders: Array.from(new Set([...normalizedConfig.evidence.assessmentProviders, provider])),
    });
    setProviderInput("");
  };

  const addCompetencyFrameworkFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    updateEvidence({
      competencyFrameworkFiles: [
        ...normalizedConfig.evidence.competencyFrameworkFiles,
        ...files.map((file) => ({
          id: createId("competency"),
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
          status: "pending_review" as const,
        })),
      ],
    });
    event.target.value = "";
    toast.success(tx("Competency framework file added for review."));
  };

  const removeCompetencyFrameworkFile = (fileId: string) => {
    updateEvidence({
      competencyFrameworkFiles: normalizedConfig.evidence.competencyFrameworkFiles.filter((file) => file.id !== fileId),
    });
    toast.success(
      normalizedConfig.evidence.secureDeletionEnabled
        ? tx("File removed. Secure deletion is enabled for stored documents.")
        : tx("File removed from configuration.")
    );
  };

  const addProgramDocuments = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const existingKeys = new Set(
      normalizedConfig.program.documents.map((file) => `${file.name.toLowerCase()}-${file.size}`)
    );
    const uniqueFiles = files.filter((file) => !existingKeys.has(`${file.name.toLowerCase()}-${file.size}`));
    if (uniqueFiles.length === 0) {
      toast.error(tx("These program documents are already added."));
      event.target.value = "";
      return;
    }

    try {
      const documentsWithSelectedType: AdminProgramDocument[] = [];

      for (const file of uniqueFiles) {
        const hash = await hashFile(file);
        const uploaded = await uploadFileMutation.mutateAsync({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          base64Data: await fileToBase64(file),
          sourceType: "program",
          fileSize: file.size,
          hash,
        });
        const extractedText = uploaded.extractedText || uploaded.extractedSummary || "";
        documentsWithSelectedType.push({
          id: uploaded.id,
          name: uploaded.name,
          url: uploaded.url,
          key: uploaded.key,
          hash: uploaded.hash,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          uploadedAt: uploaded.uploadedAt,
          status: "ready",
          documentType: programDocumentType,
          reviewStatus: "needs_review",
          extractedText,
          extractedFields: {
            programName: readableProgramName(file),
            objectives: readSectionFromText(extractedText, ["objectives?", "outcomes?", "what you will learn"]),
            moduleThemes: readSectionFromText(extractedText, ["module themes?", "modules?", "curriculum", "agenda"]),
            competencies: readSectionFromText(extractedText, ["competenc(?:y|ies)", "skills?", "capabilities"]),
          },
          extractedSummary: uploaded.extractedSummary || "Program document uploaded. Add or verify the program fields below before saving setup.",
        });
      }

      updateProgram({
        documents: [...normalizedConfig.program.documents, ...documentsWithSelectedType],
        prefillSourceDocumentId: documentsWithSelectedType[0]?.id || normalizedConfig.program.prefillSourceDocumentId,
        lastPrefilledAt: new Date().toISOString(),
        verificationNotes:
          "Review the pre-populated program fields below against the uploaded document before saving setup.",
      });
      toast.success(tx("Program document added for verification."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Unable to upload program document."));
    } finally {
      event.target.value = "";
    }
  };

  const applyProgramDocumentPrefill = (document: AdminProgramDocument) => {
    updateProgram({
      programName: document.extractedFields.programName || normalizedConfig.program.programName,
      objectives: document.extractedFields.objectives || normalizedConfig.program.objectives,
      moduleThemes: document.extractedFields.moduleThemes || normalizedConfig.program.moduleThemes,
      competencies: document.extractedFields.competencies || normalizedConfig.program.competencies,
      prefillSourceDocumentId: document.id,
      lastPrefilledAt: new Date().toISOString(),
      verificationNotes:
        "Pre-populated from uploaded program document. Verify the fields and then press Save setup.",
    });
  };

  const updateProgramDocument = (documentId: string, patch: Partial<AdminProgramDocument>) => {
    updateProgram({
      documents: normalizedConfig.program.documents.map((document) =>
        document.id === documentId ? { ...document, ...patch } : document
      ),
    });
  };

  const removeProgramDocument = (documentId: string) => {
    updateProgram({
      documents: normalizedConfig.program.documents.filter((document) => document.id !== documentId),
      prefillSourceDocumentId:
        normalizedConfig.program.prefillSourceDocumentId === documentId
          ? ""
          : normalizedConfig.program.prefillSourceDocumentId,
    });
    toast.success(tx("Program document removed from setup."));
  };

  const addCompanyDocuments = (category: CompanyDocumentCategory) => async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const maxBytes = Math.min(normalizedConfig.evidence.maxFileSizeMb, 15) * 1024 * 1024;
    const existingKeys = new Set(
      organizationCompanyDocuments.map((document) => `${document.name.toLowerCase()}-${document.size}`)
    );
    const acceptedFiles = files.filter((file) => {
      const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
      if (!normalizedConfig.evidence.allowedFileTypes.includes(extension)) {
        toast.error(`${file.name}: ${tx("This file type is not enabled in Evidence controls.")}`);
        return false;
      }
      if (file.size > maxBytes) {
        toast.error(`${file.name}: ${tx("File exceeds the current upload limit.")}`);
        return false;
      }
      if (existingKeys.has(`${file.name.toLowerCase()}-${file.size}`)) {
        toast.info(`${file.name}: ${tx("Document already added for this organization.")}`);
        return false;
      }
      return true;
    });

    if (!acceptedFiles.length) {
      event.target.value = "";
      return;
    }

    try {
      const uploadedDocuments: AdminCompanyDocument[] = [];
      for (const file of acceptedFiles) {
        const inferredCategory = category;
        const hash = await hashFile(file);
        const uploaded = await uploadFileMutation.mutateAsync({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          base64Data: await fileToBase64(file),
          sourceType: companyCategorySourceTypes[inferredCategory],
          fileSize: file.size,
          hash,
        });
        const extractedText = uploaded.extractedText || uploaded.extractedSummary || "";

        uploadedDocuments.push({
          id: uploaded.id,
          name: uploaded.name,
          url: uploaded.url,
          key: uploaded.key,
          hash: uploaded.hash,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          uploadedAt: uploaded.uploadedAt,
          status: "ready",
          organizationId: selectedOrganization.id,
          category: inferredCategory,
          sourceType: companyCategorySourceTypes[inferredCategory],
          sourceClassification: "internal_official",
          reviewStatus: "approved",
          confidentiality: "internal",
          businessUnit: "",
          geography: selectedOrganization.region || "",
          roleFamily: "",
          leadershipLevel: "",
          effectiveDate: "",
          expiryDate: "",
          owner: "",
          version: "1.0",
          extractedText,
          extractedSummary: uploaded.extractedSummary || `${companyDocumentCategoryLabels[inferredCategory]} uploaded for Admin review. Add a verified summary before approving it for IDP use.`,
          adminNotes: "",
        });
      }

      updateCompanyKnowledge({
        documents: [...normalizedConfig.companyKnowledge.documents, ...uploadedDocuments],
      });
      toast.success(
        `${uploadedDocuments.length} ${tx(
          uploadedDocuments.length === 1
            ? "company document added for review."
            : "company documents added for review."
        )}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Unable to upload company document."));
    } finally {
      event.target.value = "";
    }
  };

  const updateCompanyDocument = (documentId: string, patch: Partial<AdminCompanyDocument>) => {
    updateCompanyKnowledge({
      documents: normalizedConfig.companyKnowledge.documents.map((document) => {
        if (document.id !== documentId) return document;
        const nextCategory = patch.category || document.category;
        return {
          ...document,
          ...patch,
          sourceType: patch.category ? companyCategorySourceTypes[nextCategory] : document.sourceType,
        };
      }),
    });
  };

  const removeCompanyDocument = (documentId: string) => {
    updateCompanyKnowledge({
      documents: normalizedConfig.companyKnowledge.documents.filter(
        (document) => document.id !== documentId
      ),
    });
    toast.success(
      normalizedConfig.evidence.secureDeletionEnabled
        ? tx("Company document removed. Secure deletion is enabled for stored documents.")
        : tx("Company document removed from configuration.")
    );
  };

  const updateReport = (patch: Partial<AdminConfiguration["report"]>) => {
    updateConfig({ ...normalizedConfig, report: { ...normalizedConfig.report, ...patch } });
  };

  const updateRevisions = (patch: Partial<AdminConfiguration["revisions"]>) => {
    updateConfig({ ...normalizedConfig, revisions: { ...normalizedConfig.revisions, ...patch } });
  };

  const toggleReportSection = (section: keyof AdminConfiguration["report"]["enabledSections"]) => {
    updateReport({
      enabledSections: {
        ...normalizedConfig.report.enabledSections,
        [section]: !normalizedConfig.report.enabledSections[section],
      },
      sectionOrder: normalizedConfig.report.sectionOrder.includes(section)
        ? normalizedConfig.report.sectionOrder
        : [...normalizedConfig.report.sectionOrder, section],
    });
  };

  const toggleRevisionSection = (section: string) => {
    const current = normalizedConfig.revisions.editableSections;
    updateRevisions({
      editableSections: current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    });
  };

  const saveConfig = () => {
    if (pendingOrganization?.organizationName.trim()) {
      const organization = {
        ...pendingOrganization,
        organizationName: pendingOrganization.organizationName.trim(),
      };
      const nextConfig = normalizeAdminConfiguration({
        ...normalizedConfig,
        organization,
        organizations: [...normalizedConfig.organizations, organization],
        selectedOrganizationId: organization.id,
      });
      setPendingOrganization(null);
      setConfig(nextConfig);
      saveMutation.mutate(nextConfig);
      return;
    }

    saveMutation.mutate(normalizedConfig);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card shadow-sm">
        <div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              aria-label={t("dashboard", { defaultValue: "Dashboard" })}
              title={t("dashboard", { defaultValue: "Dashboard" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground">
                {t("adminSetupTitle", { defaultValue: "Admin Setup" })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("adminSetupDescription", {
                  defaultValue: "Configure organizations, participants, program context, IDP rules, and evidence controls.",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              className="gap-2"
            />
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {tx(reviewStatusLabels[normalizedConfig.evidence.evidenceReviewStatus])}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateConfig(createDefaultAdminConfiguration())}
              aria-label={tx("Reset defaults")}
              title={tx("Reset defaults")}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button onClick={saveConfig} disabled={saveMutation.isPending} size="icon" aria-label={tx("Save setup")} title={tx("Save setup")}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label={tx("Logout")} title={tx("Logout")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex flex-col gap-6 py-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={Building2} label="Organizations" value={String(normalizedConfig.organizations.length)} />
          <SummaryCard icon={Users} label="Selected participants" value={String(organizationParticipants.length)} />
          <SummaryCard icon={LibraryBig} label="Company documents" value={String(organizationCompanyDocuments.length)} />
          <SummaryCard icon={ClipboardList} label="IDP approaches" value={String(normalizedConfig.idp.allowedApproaches.length)} />
          <SummaryCard icon={FileCheck2} label="Evidence sections" value={String(normalizedConfig.idp.enabledEvidenceSections.length)} />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            window.history.replaceState(null, "", `#${value}`);
          }}
          className="gap-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 md:grid-cols-4 xl:grid-cols-7">
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              {tx("Organization")}
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-2">
              <Users className="h-4 w-4" />
              {tx("Participants")}
            </TabsTrigger>
            <TabsTrigger value="program" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {tx("Program")}
            </TabsTrigger>
            <TabsTrigger value="company-knowledge" className="gap-2">
              <LibraryBig className="h-4 w-4" />
              {tx("Company Knowledge")}
            </TabsTrigger>
            <TabsTrigger value="idp" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {tx("IDP Config")}
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-2">
              <FileCheck2 className="h-4 w-4" />
              {tx("Evidence")}
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {tx("Report")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>Add and select the client organization you want to configure.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {normalizedConfig.organizations.map((organization) => {
                    const participantCount = normalizedConfig.participants.filter((participant) => participant.organizationId === organization.id).length;
                    const isSelected = organization.id === selectedOrganization.id;
                    return (
                      <button
                        key={organization.id}
                        type="button"
                        data-testid={`organization-tile-${organization.id}`}
                        onClick={() => selectOrganization(organization.id)}
                        className={`rounded-md border p-3 text-left transition ${
                          isSelected ? "border-primary bg-primary/5" : "hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{organization.organizationName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {organization.region || "Global"} · {participantCount} participant{participantCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          {isSelected && <Badge variant="secondary">{tx("Selected")}</Badge>}
                        </div>
                      </button>
                    );
                  })}
                  <Button type="button" variant="outline" size="icon" onClick={addOrganization} aria-label={tx("Add organization")} title={tx("Add organization")}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  {pendingOrganization && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-sm font-semibold">{tx("New organization")}</p>
                      <div className="mt-3 grid gap-3">
                        <Field label="Organization name">
                          <Input
                            value={pendingOrganization.organizationName}
                            onChange={(event) =>
                              setPendingOrganization({ ...pendingOrganization, organizationName: event.target.value })
                            }
                            placeholder={tx("APAC Leadership Academy")}
                          />
                        </Field>
                        <Field label="Region">
                          <Input
                            value={pendingOrganization.region}
                            onChange={(event) =>
                              setPendingOrganization({ ...pendingOrganization, region: event.target.value })
                            }
                            placeholder={tx("APAC")}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button type="button" size="icon" onClick={savePendingOrganization} aria-label={tx("Save organization")} title={tx("Save organization")}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setPendingOrganization(null)}
                            aria-label={tx("Cancel")}
                            title={tx("Cancel")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Organization Setup</CardTitle>
                      <CardDescription>Set identity, branding, language, and data-retention guidance for the selected organization.</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOrganization(selectedOrganization.id)}
                      className="w-fit text-destructive"
                      disabled={normalizedConfig.organizations.length <= 1}
                      aria-label={tx("Remove")}
                      title={tx("Remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-2">
                  <Field label="Organization name">
                    <Input data-testid="organization-name-input" value={selectedOrganization.organizationName} onChange={(event) => updateOrganization({ organizationName: event.target.value })} />
                  </Field>
                  <Field label="Organization logo">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-3 rounded-md border border-dashed p-3">
                        {selectedOrganization.logoUrl ? (
                          <img src={selectedOrganization.logoUrl} alt={selectedOrganization.organizationName} className="h-10 max-w-32 object-contain" />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{tx("Upload logo")}</p>
                          <p className="text-xs text-muted-foreground">{tx("PNG, JPG, WEBP, or GIF")}</p>
                        </div>
                        <input id="organization-logo-upload" type="file" accept="image/*" onChange={uploadOrganizationLogo} className="hidden" />
                        <Button type="button" variant="outline" size="icon" asChild>
                          <label htmlFor="organization-logo-upload" className="cursor-pointer" aria-label={tx(uploadFileMutation.isPending ? "Uploading..." : "Choose")} title={tx(uploadFileMutation.isPending ? "Uploading..." : "Choose")}>
                            <Upload className="h-4 w-4" />
                          </label>
                        </Button>
                      </div>
                      <Input value={selectedOrganization.logoUrl} onChange={(event) => updateOrganization({ logoUrl: event.target.value })} placeholder="https://..." />
                    </div>
                  </Field>
                  <Field label="Primary brand color">
                    <div className="flex gap-2">
                      <Input type="color" value={selectedOrganization.primaryColor} onChange={(event) => updateOrganization({ primaryColor: event.target.value })} className="w-16 p-1" />
                      <Input value={selectedOrganization.primaryColor} onChange={(event) => updateOrganization({ primaryColor: event.target.value })} />
                    </div>
                  </Field>
                  <Field label="Secondary brand color">
                    <div className="flex gap-2">
                      <Input type="color" value={selectedOrganization.secondaryColor} onChange={(event) => updateOrganization({ secondaryColor: event.target.value })} className="w-16 p-1" />
                      <Input value={selectedOrganization.secondaryColor} onChange={(event) => updateOrganization({ secondaryColor: event.target.value })} />
                    </div>
                  </Field>
                  <Field label="Default language">
                    <Select value={selectedOrganization.defaultLanguage} onValueChange={(value) => updateOrganization({ defaultLanguage: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((language) => (
                          <SelectItem key={language.code} value={language.code}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Region">
                    <Input value={selectedOrganization.region} onChange={(event) => updateOrganization({ region: event.target.value })} />
                  </Field>
                  <div className="lg:col-span-2 rounded-md border bg-muted/20 p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SwitchRow
                        label="Enable Finalize/Publish IDP"
                        description="Apply a controlled publish workflow for IDPs generated by participants in this organization."
                        checked={selectedOrganization.idpPublishing.enabled}
                        onCheckedChange={(checked) =>
                          updateOrganization({
                            idpPublishing: {
                              ...selectedOrganization.idpPublishing,
                              enabled: checked,
                            },
                          })
                        }
                      />
                      <SwitchRow
                        label="Lock published IDP"
                        description="Treat published IDPs as locked final versions unless an admin unlocks the workflow later."
                        checked={selectedOrganization.idpPublishing.lockPublishedIdp}
                        onCheckedChange={(checked) =>
                          updateOrganization({
                            idpPublishing: {
                              ...selectedOrganization.idpPublishing,
                              lockPublishedIdp: checked,
                            },
                          })
                        }
                      />
                      <Field label="Publish behavior">
                        <Select
                          value={selectedOrganization.idpPublishing.mode}
                          onValueChange={(value) =>
                            updateOrganization({
                              idpPublishing: {
                                ...selectedOrganization.idpPublishing,
                                mode: value as AdminConfiguration["organization"]["idpPublishing"]["mode"],
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual_finalize">{tx("Generate as editable IDP")}</SelectItem>
                            <SelectItem value="publish_on_generation">{tx("Finalize/publish after generation")}</SelectItem>
                            <SelectItem value="manager_review_then_publish">{tx("Send to manager review after generation")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="text-sm text-muted-foreground">
                        {tx("This setting is applied only to the selected organization and is stored with the organization setup.")}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <Field label="Data-retention notes">
                      <Textarea value={selectedOrganization.dataRetentionNotes} onChange={(event) => updateOrganization({ dataRetentionNotes: event.target.value })} rows={4} className="resize-none" />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card>
                <CardHeader>
                  <CardTitle>Participant Management</CardTitle>
                  <CardDescription>
                    Add one participant at a time or bulk import rows for the selected organization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <Field label="Choose organization for participant records">
                    <Select
                      value={participantOrganization.id}
                      onValueChange={(value) => {
                        setParticipantOrganizationId(value);
                        selectOrganization(value);
                      }}
                    >
                      <SelectTrigger data-testid="participant-organization-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizedConfig.organizations.map((organization) => (
                          <SelectItem key={organization.id} value={organization.id}>
                            {organization.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {tx("Participant records added here will be stored with organization ID")}{" "}
                    <span className="font-medium text-foreground">{participantOrganization.id}</span>.
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <Field label="Name">
                      <Input data-testid="participant-name-input" value={newParticipant.name} onChange={(event) => setNewParticipant({ ...newParticipant, name: event.target.value })} />
                    </Field>
                    <Field label="Email">
                      <Input data-testid="participant-email-input" value={newParticipant.email} onChange={(event) => setNewParticipant({ ...newParticipant, email: event.target.value })} />
                    </Field>
                    <Field label="Password">
                      <div className="flex gap-2">
                        <Input value={newParticipant.generatedPassword} onChange={(event) => setNewParticipant({ ...newParticipant, generatedPassword: event.target.value })} />
                        <Button type="button" variant="outline" size="icon" onClick={() => setNewParticipant({ ...newParticipant, generatedPassword: generateTemporaryPassword() })} aria-label={tx("Generate password")} title={tx("Generate password")}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </div>
                    </Field>
                    <Field label="Role">
                      <Input value={newParticipant.role} onChange={(event) => setNewParticipant({ ...newParticipant, role: event.target.value })} />
                    </Field>
                    <Field label="Department">
                      <Input value={newParticipant.department} onChange={(event) => setNewParticipant({ ...newParticipant, department: event.target.value })} />
                    </Field>
                    <Field label="Manager">
                      <Input value={newParticipant.managerName} onChange={(event) => setNewParticipant({ ...newParticipant, managerName: event.target.value })} />
                    </Field>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={addParticipant} data-testid="add-participant-button" aria-label={`${tx("Add participant to")} ${participantOrganization.organizationName}`} title={`${tx("Add participant to")} ${participantOrganization.organizationName}`}>
                    <Plus className="h-4 w-4" />
                  </Button>

                  <div className="overflow-hidden rounded-md border">
                    <div className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_1fr_auto] gap-3 bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                      <span>{tx("Participant")}</span>
                      <span>{tx("Email")}</span>
                      <span>{tx("Password")}</span>
                      <span>{tx("Role")}</span>
                      <span>{tx("Manager")}</span>
                      <span>{tx("Action")}</span>
                    </div>
                    {organizationParticipants.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">{tx("No participants added for this organization yet.")}</p>
                    ) : (
                      organizationParticipants.map((participant) => (
                        <div key={participant.id} className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_1fr_auto] gap-3 border-t px-4 py-3 text-sm">
                          <span className="min-w-0 truncate font-medium">{participant.name || tx("Unnamed participant")}</span>
                          <span className="min-w-0 truncate text-muted-foreground">{participant.email || tx("No email")}</span>
                          <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{participant.generatedPassword || tx("Not generated")}</span>
                          <span className="min-w-0 truncate text-muted-foreground">{participant.role || tx("Not set")}</span>
                          <span className="min-w-0 truncate text-muted-foreground">{participant.managerName || tx("Not set")}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeParticipant(participant.id)} className="text-destructive" aria-label={`${tx("Remove")} ${participant.name || tx("participant")}`} title={`${tx("Remove")} ${participant.name || tx("participant")}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Upload Participants</CardTitle>
                  <CardDescription>
                    {tx("Paste one row per participant for")} {participantOrganization.organizationName}: {tx("name, email, role, department, manager")}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Textarea value={bulkParticipants} onChange={(event) => setBulkParticipants(event.target.value)} rows={10} className="resize-none" placeholder="Asha Rao, asha@example.com, Regional Manager, Operations, Dev Mehta" />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" size="icon" onClick={downloadParticipantTemplate} aria-label={tx("Download CSV template")} title={tx("Download CSV template")}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" onClick={importParticipants} aria-label={tx("Import pasted rows")} title={tx("Import pasted rows")}>
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input id="participant-bulk-file" type="file" accept=".csv,.txt" onChange={importParticipantFile} className="hidden" />
                    <Button type="button" variant="outline" size="icon" asChild>
                      <label htmlFor="participant-bulk-file" className="cursor-pointer" aria-label={tx("Upload CSV/TXT")} title={tx("Upload CSV/TXT")}>
                        <Upload className="h-4 w-4" />
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="program">
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Program Documents</CardTitle>
                  <CardDescription>
                    Upload a program brochure, PPT deck, or objectives document to pre-populate details for verification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Field label="Document type">
                    <Select value={programDocumentType} onValueChange={(value) => setProgramDocumentType(value as ProgramDocumentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(programDocumentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {tx(label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="rounded-md border border-dashed p-4">
                    <input
                      id="program-document-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv"
                      onChange={addProgramDocuments}
                      className="hidden"
                    />
                    <label htmlFor="program-document-upload" className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {tx("Upload brochure, PPT, or program document")}
                      </span>
                      <span className="rounded-md border px-2 py-1 text-xs">{tx("Choose files")}</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    {normalizedConfig.program.documents.length === 0 ? (
                      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {tx("No program documents added yet.")}
                      </p>
                    ) : (
                      normalizedConfig.program.documents.map((document) => (
                        <div key={document.id} className="rounded-md border p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{document.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {tx(programDocumentTypeLabels[document.documentType])} · {(document.size / 1024 / 1024).toFixed(2)} MB · {tx(programDocumentReviewLabels[document.reviewStatus])}
                              </p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeProgramDocument(document.id)} className="text-destructive" aria-label={`${tx("Remove")} ${document.name}`} title={`${tx("Remove")} ${document.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{tx(document.extractedSummary)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" size="icon" variant="outline" onClick={() => applyProgramDocumentPrefill(document)} aria-label={tx("Pre-fill fields")} title={tx("Pre-fill fields")}>
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant={document.reviewStatus === "verified" ? "secondary" : "outline"}
                              onClick={() => updateProgramDocument(document.id, { reviewStatus: document.reviewStatus === "verified" ? "needs_review" : "verified" })}
                              aria-label={tx(document.reviewStatus === "verified" ? "Verified" : "Mark verified")}
                              title={tx(document.reviewStatus === "verified" ? "Verified" : "Mark verified")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Program Setup</CardTitle>
                  <CardDescription>Add or verify the program objectives, module themes, and competencies that should ground the IDP.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <Field label="Program name">
                    <Input value={normalizedConfig.program.programName} onChange={(event) => updateProgram({ programName: event.target.value })} />
                  </Field>
                  <Field label="Program objectives">
                    <Textarea value={normalizedConfig.program.objectives} onChange={(event) => updateProgram({ objectives: event.target.value })} rows={5} className="resize-none" />
                  </Field>
                  <Field label="Module themes">
                    <Textarea value={normalizedConfig.program.moduleThemes} onChange={(event) => updateProgram({ moduleThemes: event.target.value })} rows={5} className="resize-none" />
                  </Field>
                  <Field label="Competencies">
                    <Textarea value={normalizedConfig.program.competencies} onChange={(event) => updateProgram({ competencies: event.target.value })} rows={5} className="resize-none" />
                  </Field>
                  <Field label="Verification notes">
                    <Textarea value={normalizedConfig.program.verificationNotes} onChange={(event) => updateProgram({ verificationNotes: event.target.value })} rows={3} className="resize-none" />
                  </Field>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="company-knowledge">
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Company Knowledge Documents</CardTitle>
                  <CardDescription>
                    Upload each type of organization document separately so IDP recommendations can use the right source context.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedOrganization.organizationName}</p>
                    <p className="mt-1">
                      {tx("Documents are isolated to this organization and are attached to the matching IDP evidence category.")}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {(Object.entries(companyDocumentCategoryLabels) as Array<[CompanyDocumentCategory, string]>).map(
                      ([category, label]) => {
                        const categoryDocuments = organizationCompanyDocuments.filter(
                          (document) => document.category === category
                        );
                        const inputId = `company-document-upload-${category}`;
                        return (
                          <div key={category} className="flex min-h-56 flex-col rounded-md border p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{tx(label)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {tx(evidenceLabels[companyCategorySourceTypes[category]])}
                                </p>
                              </div>
                              <input
                                id={inputId}
                                data-testid={inputId}
                                type="file"
                                multiple
                                accept={normalizedConfig.evidence.allowedFileTypes.join(",")}
                                onChange={addCompanyDocuments(category)}
                                className="hidden"
                              />
                              <Button type="button" variant="outline" size="icon" asChild>
                                <label htmlFor={inputId} className="cursor-pointer" aria-label={`${tx("Upload")} ${tx(label)}`} title={`${tx("Upload")} ${tx(label)}`}>
                                  {uploadFileMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </label>
                              </Button>
                            </div>

                            <div className="mt-4 flex flex-1 flex-col gap-2">
                              {categoryDocuments.length === 0 ? (
                                <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                                  {tx("No documents uploaded for this category.")}
                                </p>
                              ) : (
                                categoryDocuments.map((document) => (
                                  <div key={document.id} className="rounded-md border bg-background p-3 text-xs" data-testid={`company-document-${document.id}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">{document.name}</p>
                                        <p className="mt-1 text-muted-foreground">
                                          {(document.size / 1024 / 1024).toFixed(2)} MB · {tx(companyDocumentReviewLabels[document.reviewStatus])}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeCompanyDocument(document.id)}
                                        className="h-8 w-8 text-destructive"
                                        aria-label={`${tx("Remove")} ${document.name}`}
                                        title={`${tx("Remove")} ${document.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {document.extractedSummary && (
                                      <p className="mt-2 line-clamp-2 text-muted-foreground">
                                        {tx(document.extractedSummary)}
                                      </p>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    {tx("Allowed types follow Evidence controls. Maximum upload size is 15 MB per file.")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Governance</CardTitle>
                  <CardDescription>
                    Control how company evidence is validated and used during role analysis and IDP generation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <SwitchRow
                    label="Use approved documents only"
                    description="Only Admin-approved, current documents can influence generated IDPs."
                    checked={normalizedConfig.companyKnowledge.useApprovedDocumentsOnly}
                    onCheckedChange={(checked) =>
                      updateCompanyKnowledge({ useApprovedDocumentsOnly: checked })
                    }
                  />
                  <SwitchRow
                    label="Require source references"
                    description="Keep document source context attached to extracted requirements."
                    checked={normalizedConfig.companyKnowledge.requireSourceReferences}
                    onCheckedChange={(checked) =>
                      updateCompanyKnowledge({ requireSourceReferences: checked })
                    }
                  />
                  <SwitchRow
                    label="Flag evidence conflicts"
                    description="Highlight differences between company, role, and industry evidence."
                    checked={normalizedConfig.companyKnowledge.flagEvidenceConflicts}
                    onCheckedChange={(checked) =>
                      updateCompanyKnowledge({ flagEvidenceConflicts: checked })
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="idp">
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>IDP Configuration</CardTitle>
                  <CardDescription>Control approaches, evidence sections, required fields, and review behavior.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <Checklist title="Allowed IDP approaches">
                    {adminApproachOptions.map((approach) => (
                      <CheckRow key={approach} checked={normalizedConfig.idp.allowedApproaches.includes(approach)} label={approachLabels[approach]} onChange={() => toggleApproach(approach)} />
                    ))}
                  </Checklist>

                  <Checklist title="Enabled evidence sections">
                    {adminEvidenceSectionOptions.map((source) => (
                      <CheckRow key={source} checked={normalizedConfig.idp.enabledEvidenceSections.includes(source)} label={evidenceLabels[source]} onChange={() => toggleEvidenceSection(source)} />
                    ))}
                  </Checklist>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Rules</CardTitle>
                  <CardDescription>Set required fields, leadership areas, priority count, and manager review.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <Checklist title="Required fields">
                    {adminRequiredFieldOptions.map((field) => (
                      <CheckRow key={field} checked={normalizedConfig.idp.requiredFields.includes(field)} label={requiredFieldLabels[field]} onChange={() => toggleRequiredField(field)} />
                    ))}
                  </Checklist>

                  <Checklist title="Leadership areas">
                    <CheckRow checked label="Leading Self" disabled onChange={() => undefined} />
                    <CheckRow checked={normalizedConfig.idp.leadershipAreas.leadingTeam} label="Leading Team" onChange={() => updateIdp({ leadershipAreas: { ...normalizedConfig.idp.leadershipAreas, leadingTeam: !normalizedConfig.idp.leadershipAreas.leadingTeam } })} />
                    <CheckRow checked={normalizedConfig.idp.leadershipAreas.leadingBusiness} label="Leading Business" onChange={() => updateIdp({ leadershipAreas: { ...normalizedConfig.idp.leadershipAreas, leadingBusiness: !normalizedConfig.idp.leadershipAreas.leadingBusiness } })} />
                  </Checklist>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Default number of priorities">
                      <Input type="number" min={1} max={5} value={normalizedConfig.idp.defaultPriorityCount} onChange={(event) => updateIdp({ defaultPriorityCount: Number(event.target.value) })} />
                    </Field>
                    <Field label="Review period">
                      <Input value={normalizedConfig.idp.reviewPeriod} onChange={(event) => updateIdp({ reviewPeriod: event.target.value })} />
                    </Field>
                  </div>

                  <SwitchRow
                    label="Manager review required"
                    description="Participants must submit the IDP for manager review before finalizing."
                    checked={normalizedConfig.idp.managerReviewRequired}
                    onCheckedChange={(checked) => updateIdp({ managerReviewRequired: checked })}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Evidence & Document Controls</CardTitle>
                  <CardDescription>Set file controls, 70-20-10 visibility, evidence review status, and required evidence.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <Checklist title="Allowed file types">
                    {adminAllowedFileTypeOptions.map((fileType) => (
                      <CheckRow key={fileType} checked={normalizedConfig.evidence.allowedFileTypes.includes(fileType)} label={fileType.toUpperCase()} onChange={() => toggleFileType(fileType)} />
                    ))}
                  </Checklist>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Maximum file size (MB)">
                      <Input type="number" min={1} max={100} value={normalizedConfig.evidence.maxFileSizeMb} onChange={(event) => updateEvidence({ maxFileSizeMb: Number(event.target.value) })} />
                    </Field>
                    <Field label="Evidence review status">
                      <Select value={normalizedConfig.evidence.evidenceReviewStatus} onValueChange={(value) => updateEvidence({ evidenceReviewStatus: value as EvidenceReviewStatus })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(reviewStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {tx(label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="70-20-10 presentation">
                      <Select value={normalizedConfig.evidence.framework702010Mode} onValueChange={(value) => updateEvidence({ framework702010Mode: value as Framework702010Mode })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hidden">{tx("Hidden")}</SelectItem>
                          <SelectItem value="optional">{tx("Optional")}</SelectItem>
                          <SelectItem value="enabled">{tx("Enabled")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Development framework">
                      <Select value={normalizedConfig.evidence.developmentFramework} onValueChange={(value) => updateEvidence({ developmentFramework: value as AdminConfiguration["evidence"]["developmentFramework"] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="experience_people_learning">{tx("Experience, People, Learning")}</SelectItem>
                          <SelectItem value="flexible">{tx("Flexible")}</SelectItem>
                          <SelectItem value="70_20_10">70-20-10</SelectItem>
                          <SelectItem value="grow">{tx("GROW coaching model")}</SelectItem>
                          <SelectItem value="custom">{tx("Custom")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Checklist title="Required evidence by program">
                    {adminEvidenceSectionOptions.map((source) => (
                      <CheckRow key={source} checked={normalizedConfig.evidence.requiredEvidenceByProgram.includes(source)} label={evidenceLabels[source]} onChange={() => toggleRequiredEvidence(source)} />
                    ))}
                  </Checklist>

                  <SwitchRow
                    label="Secure document deletion"
                    description="Require deletion actions to remove stored document references and preserve a clean audit trail."
                    checked={normalizedConfig.evidence.secureDeletionEnabled}
                    onCheckedChange={(checked) => updateEvidence({ secureDeletionEnabled: checked })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment Providers & Framework Upload</CardTitle>
                  <CardDescription>Manage provider options and upload competency framework files for review.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div>
                    <Label className="text-sm font-medium">{tx("Assessment provider list")}</Label>
                    <div className="mt-2 flex gap-2">
                      <Input value={providerInput} onChange={(event) => setProviderInput(event.target.value)} placeholder={tx("Add provider")} />
	                      <Button type="button" variant="outline" size="icon" onClick={addProvider} aria-label={tx("Add provider")} title={tx("Add provider")}>
	                        <Plus className="h-4 w-4" />
	                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizedConfig.evidence.assessmentProviders.map((provider) => (
                        <Badge key={provider} variant="secondary" className="gap-2">
                          {provider}
                          <button
                            type="button"
                            onClick={() => updateEvidence({ assessmentProviders: normalizedConfig.evidence.assessmentProviders.filter((item) => item !== provider) })}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${provider}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{tx("Competency framework upload")}</Label>
                    <div className="mt-2 rounded-md border border-dashed p-4">
                      <input id="competency-upload" type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xml" onChange={addCompetencyFrameworkFiles} className="hidden" />
                      <label htmlFor="competency-upload" className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          {tx("Upload competency framework files")}
                        </span>
                        <span className="rounded-md border px-2 py-1 text-xs">{tx("Choose files")}</span>
                      </label>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {normalizedConfig.evidence.competencyFrameworkFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{tx("No competency framework files added yet.")}</p>
                      ) : (
                        normalizedConfig.evidence.competencyFrameworkFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.mimeType || tx("file")} · {(file.size / 1024 / 1024).toFixed(2)} MB · {tx(file.status.replace("_", " "))}
                              </p>
                            </div>
	                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCompetencyFrameworkFile(file.id)} className="text-destructive" aria-label={`${tx("Remove")} ${file.name}`} title={`${tx("Remove")} ${file.name}`}>
	                              <Trash2 className="h-4 w-4" />
	                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="report">
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>IDP Report Configuration</CardTitle>
                  <CardDescription>
                    Make the report output dynamic by controlling template, priority count, sections, branding, and print behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Report template">
                      <Select value={normalizedConfig.report.template} onValueChange={(value) => updateReport({ template: value as AdminConfiguration["report"]["template"] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(reportTemplateLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {tx(label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Target page count">
                      <Input value={normalizedConfig.report.targetPageCount} onChange={(event) => updateReport({ targetPageCount: event.target.value })} />
                    </Field>
                    <Field label="Default report priorities">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={normalizedConfig.report.maxPriorityCount}
                        onChange={(event) => {
                          const nextCount = Number(event.target.value);
                          updateReport({ maxPriorityCount: nextCount });
                          updateIdp({ defaultPriorityCount: nextCount });
                        }}
                      />
                    </Field>
                    <Field label="Section order">
                      <Input
                        value={normalizedConfig.report.sectionOrder.join(", ")}
                        onChange={(event) =>
                          updateReport({
                            sectionOrder: event.target.value.split(",").map((section) => section.trim()).filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Checklist title="Report sections">
                    {adminReportSectionOptions.map((section) => (
                      <CheckRow
                        key={section}
                        checked={normalizedConfig.report.enabledSections[section]}
                        label={reportSectionLabels[section]}
                        onChange={() => toggleReportSection(section)}
                      />
                    ))}
                  </Checklist>

                  <div className="grid gap-3 md:grid-cols-2">
                    <SwitchRow
                      label="Use organization branding"
                      description="Apply organization logo and brand colors to web and export views."
                      checked={normalizedConfig.report.useOrganizationBranding}
                      onCheckedChange={(checked) => updateReport({ useOrganizationBranding: checked })}
                    />
                    <SwitchRow
                      label="Print-friendly web view"
                      description="Keep report layout clean for browser print and PDF export."
                      checked={normalizedConfig.report.printFriendlyView}
                      onCheckedChange={(checked) => updateReport({ printFriendlyView: checked })}
                    />
                    <SwitchRow
                      label="Show evidence confidence"
                      description="Display confidence and source context for confirmed insights."
                      checked={normalizedConfig.report.showEvidenceConfidence}
                      onCheckedChange={(checked) => updateReport({ showEvidenceConfidence: checked })}
                    />
                    <SwitchRow
                      label="Show AI disclosure"
                      description="Include a concise note that AI helped synthesize confirmed evidence."
                      checked={normalizedConfig.report.showAiDisclosure}
                      onCheckedChange={(checked) => updateReport({ showAiDisclosure: checked })}
                    />
                  </div>

                  <Field label="Custom report instructions">
                    <Textarea value={normalizedConfig.report.customInstructions} onChange={(event) => updateReport({ customInstructions: event.target.value })} rows={4} className="resize-none" />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revisions & Manager Review Logic</CardTitle>
                  <CardDescription>
                    Configure what can be revised after generation and how manager edits should be handled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <SwitchRow
                      label="Allow participant revisions"
                      description="Participants can update editable report sections after generation."
                      checked={normalizedConfig.revisions.allowParticipantRevisions}
                      onCheckedChange={(checked) => updateRevisions({ allowParticipantRevisions: checked })}
                    />
                    <SwitchRow
                      label="Allow manager suggested edits"
                      description="Manager comments and suggested edits remain available for review."
                      checked={normalizedConfig.revisions.allowManagerSuggestedEdits}
                      onCheckedChange={(checked) => updateRevisions({ allowManagerSuggestedEdits: checked })}
                    />
                    <SwitchRow
                      label="Require revision reason"
                      description="Revisions should include a reason for audit clarity."
                      checked={normalizedConfig.revisions.requireRevisionReason}
                      onCheckedChange={(checked) => updateRevisions({ requireRevisionReason: checked })}
                    />
                    <SwitchRow
                      label="Require manager re-approval"
                      description="Material participant edits should route back to manager review."
                      checked={normalizedConfig.revisions.requireManagerReapproval}
                      onCheckedChange={(checked) => updateRevisions({ requireManagerReapproval: checked })}
                    />
                    <SwitchRow
                      label="Show revision history"
                      description="Display revision history in admin/report review interfaces."
                      checked={normalizedConfig.revisions.showRevisionHistory}
                      onCheckedChange={(checked) => updateRevisions({ showRevisionHistory: checked })}
                    />
                    <SwitchRow
                      label="Lock finalized IDP"
                      description="Prevent edits after finalization unless admin unlocks later."
                      checked={normalizedConfig.revisions.lockFinalizedIdp}
                      onCheckedChange={(checked) => updateRevisions({ lockFinalizedIdp: checked })}
                    />
                  </div>

                  <Field label="Revision cadence">
                    <Select value={normalizedConfig.revisions.revisionCadence} onValueChange={(value) => updateRevisions({ revisionCadence: value as AdminConfiguration["revisions"]["revisionCadence"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_demand">{tx("On demand")}</SelectItem>
                        <SelectItem value="monthly">{tx("Monthly")}</SelectItem>
                        <SelectItem value="quarterly">{tx("Quarterly")}</SelectItem>
                        <SelectItem value="program_milestone">{tx("Program milestone")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Checklist title="Editable report sections">
                    {adminRevisionSectionOptions.map((section) => (
                      <CheckRow
                        key={section}
                        checked={normalizedConfig.revisions.editableSections.includes(section)}
                        label={revisionSectionLabels[section]}
                        onChange={() => toggleRevisionSection(section)}
                      />
                    ))}
                  </Checklist>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CardTitle({ children, ...props }: ComponentProps<typeof UiCardTitle>) {
  const tx = useAutoTranslatedText();
  return <UiCardTitle {...props}>{typeof children === "string" ? tx(children) : children}</UiCardTitle>;
}

function CardDescription({ children, ...props }: ComponentProps<typeof UiCardDescription>) {
  const tx = useAutoTranslatedText();
  return <UiCardDescription {...props}>{typeof children === "string" ? tx(children) : children}</UiCardDescription>;
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  const tx = useAutoTranslatedText();
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{tx(label)}</p>
          <p className="mt-1 truncate text-xl font-semibold">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const tx = useAutoTranslatedText();
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{tx(label)}</Label>
      {children}
    </div>
  );
}

function Checklist({ title, children }: { title: string; children: ReactNode }) {
  const tx = useAutoTranslatedText();
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{tx(title)}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function CheckRow({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  const tx = useAutoTranslatedText();
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60" data-disabled={disabled}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <span>{tx(label)}</span>
    </label>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const tx = useAutoTranslatedText();
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-semibold">{tx(label)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tx(description)}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
