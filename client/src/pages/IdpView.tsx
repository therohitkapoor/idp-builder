import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import CoachingAssistant from "@/components/CoachingAssistant";
import LanguageSelector, {
  applyLanguagePreference,
  getStoredOutputLanguage,
  isSupportedLanguageCode,
  type LanguageCode,
} from "@/components/LanguageSelector";
import LearningResources from "@/components/LearningResources";
import SignaturePad from "@/components/SignaturePad";
import { ObjectivesNav } from "@/components/ObjectivesNav";
import { GrowModelDiagram } from "@/components/GrowModelDiagram";
import { translateReportRecord, translateReportText } from "@/lib/reportTranslation";
import type { DevelopmentFramework, ManagerReview, ObjectiveProgressStatus, PriorityCheckIn } from "@shared/idpEnterprise";
import { 
  Download, 
  ArrowLeft, 
  User, 
  Building, 
  Calendar, 
  Briefcase, 
  Target,
  BookOpen,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  PenTool,
  Mail,
  FileSpreadsheet,
  Bot,
  BotOff,
  AlertCircle,
  MessageSquare,
  Save,
  XCircle
} from "lucide-react";

const StrengthsGapsCharts = lazy(() => import("@/components/StrengthsGapsCharts"));

type Objective = {
  title: string;
  description: string;
  deadline?: string;
  measurable: string;
  criticality: "low" | "medium" | "high" | "critical";
  dimension?: string;
  whyThisMatters?: string;
  expectedBusinessImpact?: string;
  recommendedActions?: string[];
  evidenceOfSuccess?: string;
  targetReviewDate?: string;
  status: ObjectiveProgressStatus;
  progress: number;
  latestReflection?: string;
  evidenceUploaded?: Array<{ name: string; key?: string; url?: string; uploadedAt?: string }>;
  managerFeedback?: string;
  reviewDate?: string;
  nextAction?: string;
  checkIns?: PriorityCheckIn[];
  sourceEvidence?: Array<{
    sourceType: string;
    sourceReference: string;
    confidence: "low" | "medium" | "high";
    userConfirmed: boolean;
    aiInferred: boolean;
  }>;
  recommendations: {
    experiential: string[];
    social: string[];
    formal: string[];
  };
};

type StrengthGap = {
  area: string;
  score: number;
};

type ActionPlan = {
  thirtyDays?: string[];
  sixtyDays?: string[];
  ninetyDays?: string[];
};

type ManagerGuide = {
  keyLearnings?: string[];
  supportNeeded?: string[];
  resourcesRequired?: string[];
  questionsForManager?: string[];
  discussionAgenda?: string[];
};

type Commitments = {
  start?: string;
  stop?: string;
  continue?: string;
  experiment?: string;
  success?: string;
  reviewDate?: string;
};

type ProgressDraft = {
  status: ObjectiveProgressStatus;
  progress: number;
  deadline?: string;
  latestReflection: string;
  evidenceUploadedText: string;
  managerFeedback: string;
  reviewDate?: string;
  nextAction: string;
  checkIn: {
    whatTried: string;
    whatHappened: string;
    whatChanged: string;
    whatGotInTheWay: string;
    whatNext: string;
    supportNeeded: string;
  };
};

const asList = (items: unknown, fallback: string[]) =>
  Array.isArray(items) && items.length > 0 ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : fallback;

const getDateOrNull = (value?: string | Date | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLocales: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  zh: "zh-CN",
  ar: "ar-SA",
  id: "id-ID",
  vi: "vi-VN",
  th: "th-TH",
  es: "es-ES",
  de: "de-DE",
  nl: "nl-NL",
};

const getActionMethodLabels = (framework: DevelopmentFramework, translate: (key: string) => string) => {
  if (framework === "70_20_10") {
    return [
      { key: "experiential", title: translate("experientialLearning"), subtitle: translate("experientialSubtitle"), tone: "green" as const },
      { key: "social", title: translate("socialLearning"), subtitle: translate("socialSubtitle"), tone: "blue" as const },
      { key: "formal", title: translate("formalLearning"), subtitle: translate("formalSubtitle"), tone: "amber" as const },
    ];
  }

  if (framework === "grow") {
    return [
      { key: "experiential", title: translate("growGoalRealityActionLabel"), subtitle: translate("growGoalRealityActionSubtitle"), tone: "green" as const },
      { key: "social", title: translate("growOptionsActionLabel"), subtitle: translate("growOptionsActionSubtitle"), tone: "blue" as const },
      { key: "formal", title: translate("growWillActionLabel"), subtitle: translate("growWillActionSubtitle"), tone: "amber" as const },
    ];
  }

  return [
    { key: "experiential", title: translate("experienceActionLabel"), subtitle: translate("experienceActionSubtitle"), tone: "green" as const },
    { key: "social", title: translate("peopleActionLabel"), subtitle: translate("peopleActionSubtitle"), tone: "blue" as const },
    { key: "formal", title: translate("learningActionLabel"), subtitle: translate("learningActionSubtitle"), tone: "amber" as const },
  ];
};

const reportSourceLabelKeys: Record<string, string> = {
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

const getReportSourceLabel = (sourceType: string, translate: (key: string) => string) =>
  translate(reportSourceLabelKeys[sourceType] || "sourceOther");

const createProgressDraft = (objective: Objective): ProgressDraft => ({
  status: objective.status || "not_started",
  progress: objective.progress || 0,
  deadline: objective.deadline || "",
  latestReflection: objective.latestReflection || "",
  evidenceUploadedText: (objective.evidenceUploaded || []).map((item) => item.name).join("\n"),
  managerFeedback: objective.managerFeedback || "",
  reviewDate: objective.reviewDate || objective.targetReviewDate || objective.deadline || "",
  nextAction: objective.nextAction || objective.recommendedActions?.[0] || "",
  checkIn: {
    whatTried: "",
    whatHappened: "",
    whatChanged: "",
    whatGotInTheWay: "",
    whatNext: "",
    supportNeeded: "",
  },
});

export default function IdpView() {
  const { t, i18n } = useTranslation();
  const languageBase = i18n.language.split("-")[0];
  const isRTL = languageBase === 'ar';
  const dateLocale = dateLocales[languageBase] || "en-US";
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const [editingObjective, setEditingObjective] = useState<number | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: "",
    recipientName: "",
    message: "",
  });
  const [showEmployeeSignature, setShowEmployeeSignature] = useState(false);
  const [showManagerSignature, setShowManagerSignature] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => getStoredOutputLanguage());
  const [hasAppliedSavedLanguage, setHasAppliedSavedLanguage] = useState(false);
  const [progressDrafts, setProgressDrafts] = useState<Record<number, ProgressDraft>>({});
  const [managerReviewComment, setManagerReviewComment] = useState("");
  const [managerReviewObjectiveIndex, setManagerReviewObjectiveIndex] = useState("0");
  const [managerSuggestedValue, setManagerSuggestedValue] = useState("");
  const [managerReviewDates, setManagerReviewDates] = useState("");
  const [managerSummaryComment, setManagerSummaryComment] = useState("");
  const formatReportDate = (value: string | Date | null | undefined) => {
    const date = getDateOrNull(value);
    if (!date) return t("notSpecified");
    return new Intl.DateTimeFormat(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };
  
  const idpId = parseInt(params.id || "0");
  
  const utils = trpc.useUtils();
  const { data: idp, isLoading, error } = trpc.idp.getIdp.useQuery(
    { id: idpId },
    { enabled: idpId > 0 }
  );
  const publicationState = (idp as any)?.enterpriseMetadata?.publication as
    | { enabled?: boolean; mode?: string; appliedStatus?: string }
    | undefined;
  const canFinalizeIdp =
    Boolean(publicationState?.enabled) &&
    publicationState?.mode === "manual_finalize" &&
    (idp as any)?.status !== "finalized";

  useEffect(() => {
    if (!idp || hasAppliedSavedLanguage) return;
    const savedOutputLanguage = (idp as any).enterpriseMetadata?.outputLanguage;
    if (isSupportedLanguageCode(savedOutputLanguage)) {
      setSelectedLanguage(savedOutputLanguage);
      applyLanguagePreference(savedOutputLanguage, i18n);
    }
    setHasAppliedSavedLanguage(true);
  }, [hasAppliedSavedLanguage, idp, i18n]);

  const updateStatusMutation = trpc.idp.updateObjectiveStatus.useMutation({
    onSuccess: () => {
      utils.idp.getIdp.invalidate({ id: idpId });
      setEditingObjective(null);
    },
  });

  const sendEmailMutation = trpc.idp.sendIdpEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEmailDialogOpen(false);
      setEmailForm({ recipientEmail: "", recipientName: "", message: "" });
    },
    onError: () => {
      toast.error(t("sendEmailError"));
    },
  });

  const saveSignatureMutation = trpc.idp.saveSignature.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.idp.getIdp.invalidate({ id: idpId });
      setShowEmployeeSignature(false);
      setShowManagerSignature(false);
    },
    onError: () => {
      toast.error(t("signatureError"));
    },
  });

  const submitForManagerReviewMutation = trpc.idp.submitForManagerReview.useMutation({
    onSuccess: () => {
      toast.success(t("submittedForManagerReview"));
      utils.idp.getIdp.invalidate({ id: idpId });
    },
  });

  const addManagerReviewInputMutation = trpc.idp.addManagerReviewInput.useMutation({
    onSuccess: () => {
      toast.success(t("managerReviewUpdated"));
      setManagerReviewComment("");
      setManagerSuggestedValue("");
      utils.idp.getIdp.invalidate({ id: idpId });
    },
  });

  const resolveManagerEditMutation = trpc.idp.resolveManagerEdit.useMutation({
    onSuccess: () => {
      toast.success(t("managerEditResolved"));
      utils.idp.getIdp.invalidate({ id: idpId });
    },
  });

  const markManagerReviewedMutation = trpc.idp.markManagerReviewed.useMutation({
    onSuccess: () => {
      toast.success(t("managerMarkedReviewed"));
      utils.idp.getIdp.invalidate({ id: idpId });
    },
  });

  const finalizeIdpMutation = trpc.idp.finalizeIdp.useMutation({
    onSuccess: () => {
      toast.success(t("idpFinalizedPublished"));
      utils.idp.getIdp.invalidate({ id: idpId });
    },
    onError: () => toast.error(t("idpFinalizeError")),
  });

  const agreeReviewDatesMutation = trpc.idp.agreeReviewDates.useMutation({
    onSuccess: () => {
      toast.success(t("reviewDatesSaved"));
      utils.idp.getIdp.invalidate({ id: idpId });
    },
  });

  const handleLanguageChange = (language: LanguageCode) => {
    setSelectedLanguage(language);
    applyLanguagePreference(language, i18n);
  };

  const openProgressEditor = (index: number, objective: Objective) => {
    setProgressDrafts((prev) => ({ ...prev, [index]: prev[index] || createProgressDraft(objective) }));
    setEditingObjective(editingObjective === index ? null : index);
  };

  const updateProgressDraft = (index: number, patch: Partial<ProgressDraft>) => {
    setProgressDrafts((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || createProgressDraft(objectives[index])),
        ...patch,
      },
    }));
  };

  const updateCheckInDraft = (index: number, field: keyof ProgressDraft["checkIn"], value: string) => {
    setProgressDrafts((prev) => {
      const current = prev[index] || createProgressDraft(objectives[index]);
      return {
        ...prev,
        [index]: {
          ...current,
          checkIn: {
            ...current.checkIn,
            [field]: value,
          },
        },
      };
    });
  };

  const saveProgressDraft = (index: number) => {
    const draft = progressDrafts[index] || createProgressDraft(objectives[index]);
    const hasCheckIn = Object.values(draft.checkIn).some((value) => value.trim().length > 0);
    updateStatusMutation.mutate({
      idpId,
      objectiveIndex: index,
      status: draft.status,
      progress: draft.progress,
      deadline: draft.deadline || undefined,
      latestReflection: draft.latestReflection,
      evidenceUploaded: draft.evidenceUploadedText
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name, uploadedAt: new Date().toISOString() })),
      managerFeedback: draft.managerFeedback,
      reviewDate: draft.reviewDate || undefined,
      nextAction: draft.nextAction,
      checkIn: hasCheckIn ? draft.checkIn : undefined,
    });
    toast.success(t("progressUpdatedSuccess"));
  };

  const handleAddManagerReviewInput = () => {
    const objectiveIndex = Number(managerReviewObjectiveIndex) || 0;
    if (!managerReviewComment.trim() && !managerSuggestedValue.trim()) {
      toast.error(t("managerReviewInputRequired"));
      return;
    }

    const objective = objectives[objectiveIndex];
    addManagerReviewInputMutation.mutate({
      idpId,
      objectiveIndex,
      comment: managerReviewComment,
      suggestedEdit: managerSuggestedValue.trim()
        ? {
            field: "nextAction",
            currentValue: objective?.nextAction || objective?.recommendedActions?.[0] || "",
            suggestedValue: managerSuggestedValue,
            rationale: managerReviewComment,
          }
        : undefined,
    });
  };

  const handleSaveReviewDates = () => {
    const dates = managerReviewDates
      .split(/\n|,/)
      .map((date) => date.trim())
      .filter(Boolean);
    if (dates.length === 0) {
      toast.error(t("reviewDateRequired"));
      return;
    }
    agreeReviewDatesMutation.mutate({ idpId, reviewDates: dates });
  };

  const handleSendEmail = () => {
    if (!emailForm.recipientEmail) {
      toast.error(t("enterRecipientEmail"));
      return;
    }
    sendEmailMutation.mutate({
      idpId,
      ...emailForm,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Employee Information Sheet
      const employeeData = [
        [t("employeeInformation")],
        [""],
        [t("employeeName"), idp?.employeeName || ""],
        [t("position"), idp?.position || t("notAvailable")],
        [t("company"), idp?.company || ""],
        [t("department"), idp?.department || ""],
        [t("yearsOfExperience"), idp?.yearsOfExperience?.toString() || ""],
        [t("dateOfJoining"), formatReportDate(idp?.dateOfJoining)],
        [t("dateOfIdpCreation"), formatReportDate((idp as any)?.dateOfIdpCreation)],
        [t("directManager"), idp?.directManager || ""],
      ];
      const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(wb, employeeSheet, t("employeeInformation").slice(0, 31));
      
      // Leadership Priorities Sheet
      const objectivesData = [
        [t("developmentPrioritiesOverview")],
        [""],
        ["#", t("dimension"), t("title"), t("evidenceOfSuccess"), t("priority"), t("status"), t("progress"), t("reviewDate")],
      ];
      objectives.forEach((obj, index) => {
        objectivesData.push([
          (index + 1).toString(),
          obj.dimension || "",
          obj.title,
          obj.evidenceOfSuccess || obj.measurable,
          obj.criticality ? t(obj.criticality) : t("notAvailable"),
          obj.status === "completed" ? t("completed") : obj.status === "in_progress" ? t("inProgress") : t("notStarted"),
          `${obj.progress || 0}%`,
          obj.targetReviewDate ? formatReportDate(obj.targetReviewDate) : obj.deadline ? formatReportDate(obj.deadline) : t("notSet")
        ]);
      });
      const objectivesSheet = XLSX.utils.aoa_to_sheet(objectivesData);
      XLSX.utils.book_append_sheet(wb, objectivesSheet, t("developmentPrioritiesOverview").slice(0, 31));
      
      // Development Actions Sheet
      const activitiesData = [
        [t("developmentActions")],
        [""],
        [t("priority"), t("method"), t("action")],
      ];
      objectives.forEach((obj, index) => {
        actionMethodLabels.forEach((method) => {
          const fallbackItems =
            method.key === "experiential"
              ? (obj.recommendedActions || []).slice(0, 2)
              : method.key === "social"
                ? (obj.recommendedActions || []).slice(2, 4)
                : (obj.recommendedActions || []).slice(4, 6);
          const actions = asList(obj.recommendations?.[method.key as keyof Objective["recommendations"]], fallbackItems);
          actions.forEach((activity) => {
            activitiesData.push([t("priorityNumber", { number: index + 1, title: obj.title }), method.title, activity]);
          });
        });
      });
      const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
      XLSX.utils.book_append_sheet(wb, activitiesSheet, t("developmentActions").slice(0, 31));

      // 30-60-90 Roadmap Sheet
      const roadmapData = [
        [t("actionPlanTitle")],
        [""],
        [t("timeframe"), t("focus"), t("action")],
        ...roadmapPlan.thirtyDays.map((item) => [t("days30"), t("roadmap30Subtitle"), item]),
        ...roadmapPlan.sixtyDays.map((item) => [t("days60"), t("roadmap60Subtitle"), item]),
        ...roadmapPlan.ninetyDays.map((item) => [t("days90"), t("roadmap90Subtitle"), item]),
      ];
      const roadmapSheet = XLSX.utils.aoa_to_sheet(roadmapData);
      XLSX.utils.book_append_sheet(wb, roadmapSheet, t("actionPlanShort").slice(0, 31));

      // Manager Guide Sheet
      const managerGuideData = [
        [t("managerDiscussionGuide")],
        [""],
        [t("section"), t("item")],
        ...reportManagerGuide.keyLearnings.map((item) => [t("keyLearnings"), item]),
        ...reportManagerGuide.supportNeeded.map((item) => [t("supportNeeded"), item]),
        ...reportManagerGuide.resourcesRequired.map((item) => [t("resourcesRequired"), item]),
        ...reportManagerGuide.questionsForManager.map((item) => [t("questionsForManager"), item]),
        ...reportManagerGuide.discussionAgenda.map((item) => [t("discussionAgenda"), item]),
      ];
      const managerGuideSheet = XLSX.utils.aoa_to_sheet(managerGuideData);
      XLSX.utils.book_append_sheet(wb, managerGuideSheet, t("managerGuideShort").slice(0, 31));
      
      // Strengths Sheet
      const strengthsData = [
        [t("keyStrengthAreas")],
        [""],
        [t("strength"), t("score")],
      ];
      strengths.forEach((strength) => {
        strengthsData.push([strength.area, strength.score.toString()]);
      });
      const strengthsSheet = XLSX.utils.aoa_to_sheet(strengthsData);
      XLSX.utils.book_append_sheet(wb, strengthsSheet, t("keyStrengths").slice(0, 31));
      
      // Gaps Sheet
      const gapsData = [
        [t("keyDevelopmentGaps")],
        [""],
        [t("gap"), t("score")],
      ];
      gaps.forEach((gap) => {
        gapsData.push([gap.area, gap.score.toString()]);
      });
      const gapsSheet = XLSX.utils.aoa_to_sheet(gapsData);
      XLSX.utils.book_append_sheet(wb, gapsSheet, t("developmentGaps").slice(0, 31));
      
      // Summary Sheet
      const summaryData = [
        [t("summaryRecommendations")],
        [""],
        [summaryAdvice || t("noSummaryAvailable")],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, t("summarySheetShort").slice(0, 31));
      
      // Generate and download
      XLSX.writeFile(wb, `IDP_${idp?.employeeName.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(t("excelDownloadedSuccess"));
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(t("excelExportError"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-xl">{t("loadingIdp")}</span>
        </div>
      </div>
    );
  }

  if (error || !idp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{t("failedLoadIdp")}</p>
            <Button
              onClick={() => setLocation("/")}
              size="icon"
              aria-label={t("backToHome")}
              title={t("backToHome")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rawObjectives = (idp.objectives as Objective[]) || [];
  const rawStrengths = (idp.strengths as StrengthGap[]) || [];
  const rawGaps = (idp.gaps as StrengthGap[]) || [];
  const rawGrowModel = (idp.growModel as any) || {};
  const objectives = translateReportRecord(rawObjectives, selectedLanguage) as Objective[];
  const strengths = translateReportRecord(rawStrengths, selectedLanguage) as StrengthGap[];
  const gaps = translateReportRecord(rawGaps, selectedLanguage) as StrengthGap[];
  const growModel = translateReportRecord(rawGrowModel, selectedLanguage) as any;
  const leadershipSummary = translateReportRecord((idp as any).leadershipSummary || rawGrowModel.leadershipSummary || {
    leadershipTheme: t("defaultLeadershipTheme"),
    topStrengths: strengths.slice(0, 3).map((item) => item.area),
    growthOpportunities: gaps.slice(0, 3).map((item) => item.area),
    threeLeadershipPriorities: objectives.slice(0, 3).map((item) => item.title),
    keyCommitments: [],
    dayFocus: t("defaultDayFocus"),
    managerSupportNeeded: [],
  }, selectedLanguage) as any;
  const commitments = translateReportRecord(((idp as any).commitments || rawGrowModel.commitments || null), selectedLanguage) as Commitments | null;
  const actionPlan = translateReportRecord(((idp as any).actionPlan || rawGrowModel.actionPlan || null), selectedLanguage) as ActionPlan | null;
  const managerGuide = translateReportRecord(((idp as any).managerGuide || rawGrowModel.managerGuide || null), selectedLanguage) as ManagerGuide | null;
  const enterpriseMetadata = (idp as any).enterpriseMetadata || rawGrowModel.enterpriseMetadata || null;
  const organizationConfig = ((idp as any).organizationConfig || enterpriseMetadata?.organizationContext || {}) as Record<string, any>;
  const reportConfiguration = (organizationConfig.idpReportConfiguration || enterpriseMetadata?.reportConfiguration || {}) as {
    enabledSections?: Record<string, boolean>;
    sectionOrder?: string[];
    showEvidenceConfidence?: boolean;
    showAiDisclosure?: boolean;
  };
  const reportSections = {
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
    ...reportConfiguration.enabledSections,
  };
  type ReportSectionKey = keyof typeof reportSections;
  const defaultReportSectionOrder = Object.keys(reportSections) as ReportSectionKey[];
  const configuredReportSectionOrder = Array.isArray(reportConfiguration.sectionOrder)
    ? reportConfiguration.sectionOrder.filter((section): section is ReportSectionKey => section in reportSections)
    : [];
  const reportSectionOrder = [
    ...configuredReportSectionOrder,
    ...defaultReportSectionOrder.filter((section) => !configuredReportSectionOrder.includes(section)),
  ];
  const sectionOrderStyle = (section: ReportSectionKey) => ({
    order: reportSectionOrder.indexOf(section) >= 0 ? reportSectionOrder.indexOf(section) : 99,
  });
  const sourceFiles = translateReportRecord(((idp as any).sourceFiles || []), selectedLanguage) as Array<{
    id?: string;
    name: string;
    sourceType: string;
    extractedSummary?: string;
    extractedText?: string;
  }>;
  const confirmedEvidenceInsights = translateReportRecord(((idp as any).confirmedInsights || []), selectedLanguage) as Array<{
    id?: string;
    text: string;
    sourceType: string;
    confidence?: "low" | "medium" | "high";
    userConfirmed?: boolean;
    aiInferred?: boolean;
  }>;
  const rt = (value: string) => translateReportText(value, selectedLanguage);
  const summaryAdvice = translateReportText(idp.summaryAdvice || "", selectedLanguage);
  const localizedLearningResources = idp.learningResources
    ? (translateReportRecord(idp.learningResources as any[], selectedLanguage) as any[])
    : undefined;
  const developmentFramework = (((idp as any).developmentFramework || enterpriseMetadata?.developmentFramework || "experience_people_learning") as DevelopmentFramework);
  const actionMethodLabels = getActionMethodLabels(developmentFramework, t);
  const managerReview = translateReportRecord(((idp as any).managerReview || {
    status: "not_submitted",
    managerName: idp.directManager || "",
    agreedReviewDates: [],
    comments: [],
    suggestedEdits: [],
  }), selectedLanguage) as ManagerReview;
  const confidenceScore = enterpriseMetadata?.confidenceScore ?? 70;
  const completedObjectives = objectives.filter((objective) => objective.status === "completed").length;
  const overallProgress =
    objectives.length > 0
      ? Math.round(objectives.reduce((total, objective) => total + (objective.progress || 0), 0) / objectives.length)
      : 0;
  const reviewDate =
    objectives
      .map((objective) => getDateOrNull(objective.targetReviewDate || objective.deadline))
      .find((date): date is Date => Boolean(date)) ||
    getDateOrNull(commitments?.reviewDate) ||
    (() => {
      const fallbackDate = new Date(idp.dateOfIdpCreation);
      fallbackDate.setDate(fallbackDate.getDate() + 90);
      return fallbackDate;
    })();
  const reviewDateLabel = formatReportDate(reviewDate);
  const lastCheckInDate = objectives
    .flatMap((objective) => objective.checkIns || [])
    .map((checkIn) => getDateOrNull(checkIn.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const lastReviewedDate = getDateOrNull(managerReview.reviewedAt) || lastCheckInDate || getDateOrNull(idp.updatedAt);
  const nextReviewDate =
    managerReview.agreedReviewDates
      ?.map((date) => getDateOrNull(date))
      .filter((date): date is Date => Boolean(date))
      .find((date) => date >= new Date(new Date().setHours(0, 0, 0, 0))) || reviewDate;
  const atRiskPriorities = objectives.filter((objective) => objective.status === "blocked" || (objective.progress || 0) < 25);
  const roadmapPlan = {
    thirtyDays: asList(actionPlan?.thirtyDays, [
      t("fallback30DayAction1"),
      t("fallback30DayAction2"),
      t("fallback30DayAction3"),
    ]),
    sixtyDays: asList(actionPlan?.sixtyDays, [
      t("fallback60DayAction1"),
      t("fallback60DayAction2"),
      t("fallback60DayAction3"),
    ]),
    ninetyDays: asList(actionPlan?.ninetyDays, [
      t("fallback90DayAction1"),
      t("fallback90DayAction2"),
      t("fallback90DayAction3"),
    ]),
  };
  const reportManagerGuide = {
    keyLearnings: asList(managerGuide?.keyLearnings, leadershipSummary.keyCommitments || []),
    supportNeeded: asList(managerGuide?.supportNeeded, leadershipSummary.managerSupportNeeded || []),
    resourcesRequired: asList(managerGuide?.resourcesRequired, [
      t("fallbackResource1"),
      t("fallbackResource2"),
      t("fallbackResource3"),
    ]),
    questionsForManager: asList(managerGuide?.questionsForManager, [
      t("fallbackManagerQuestion1"),
      t("fallbackManagerQuestion2"),
      t("fallbackManagerQuestion3"),
    ]),
    discussionAgenda: asList(managerGuide?.discussionAgenda, [
      t("fallbackAgenda1"),
      t("fallbackAgenda2"),
      t("fallbackAgenda3"),
      t("fallbackAgenda4"),
    ]),
  };
  const allActionItems = objectives.flatMap((objective, objectiveIndex) =>
    actionMethodLabels.flatMap((method) => {
      const items = asList(
        objective.recommendations?.[method.key as keyof Objective["recommendations"]],
        method.key === "experiential"
          ? (objective.recommendedActions || []).slice(0, 2)
          : method.key === "social"
            ? (objective.recommendedActions || []).slice(2, 4)
            : (objective.recommendedActions || []).slice(4, 6)
      );
      return items.map((item) => ({
        priority: objective.title,
        priorityIndex: objectiveIndex + 1,
        method: method.title,
        item,
      }));
    })
  );
  const growThinkExecuteInspireItems = [
    {
      label: "GROW",
      value: growModel.goal || leadershipSummary.leadershipTheme,
    },
    {
      label: "THINK",
      value: leadershipSummary.growthOpportunities?.[0] || gaps[0]?.area || rt("Clarify the thinking shift required for this role."),
    },
    {
      label: "EXECUTE",
      value: objectives[0]?.nextAction || objectives[0]?.recommendedActions?.[0] || rt("Turn the priority into a visible work experiment."),
    },
    {
      label: "INSPIRE",
      value: reportManagerGuide.supportNeeded?.[0] || rt("Bring others into the change through feedback and support."),
    },
  ];

  // Enhanced color palettes for charts
  const strengthColors = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];
  const gapColors = ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 transition-shadow duration-300 hover:shadow-md">
        <div className="container flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full min-w-0 items-center gap-4 lg:w-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/")}
              className="shrink-0 transition-all duration-200 hover:scale-105"
              aria-label={t("back")}
              title={t("back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029322203/HPcFanTDeMMosnOA.png"
              alt="Emeritus"
              className="h-8 max-w-[120px] object-contain transition-transform duration-300 hover:scale-105 sm:max-w-none"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              className="w-full justify-center gap-2 transition-all duration-300 hover:scale-105 print:hidden lg:w-auto"
            />
            <Button
              variant={showChatbot ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowChatbot((prev) => !prev)}
              className="justify-center transition-all duration-300 hover:scale-105 print:hidden"
              aria-label={showChatbot ? t("hideReflectionSupport") : t("reflectionSupport")}
              title={showChatbot ? t("hideReflectionSupport") : t("reflectionSupport")}
            >
              {showChatbot ? <Bot className="h-4 w-4" /> : <BotOff className="h-4 w-4" />}
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  size="icon"
                  className="justify-center transition-all duration-300 hover:scale-105"
                  aria-label={t("shareViaEmail")}
                  title={t("shareViaEmail")}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("shareIdpViaEmail")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="recipientEmail">{t("recipientEmail")} *</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      placeholder="manager@company.com"
                      value={emailForm.recipientEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientName">{t("recipientNameOptional")}</Label>
                    <Input
                      id="recipientName"
                      placeholder="John Doe"
                      value={emailForm.recipientName}
                      onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">{t("messageOptional")}</Label>
                    <Textarea
                      id="message"
                      placeholder={t("addPersonalMessage")}
                      value={emailForm.message}
                      onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendEmailMutation.isPending}
                    size="icon"
                    className="ml-auto"
                    aria-label={t("sendEmail")}
                    title={t("sendEmail")}
                  >
                    {sendEmailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {canFinalizeIdp && (
              <Button
                onClick={() => finalizeIdpMutation.mutate({ idpId })}
                disabled={finalizeIdpMutation.isPending}
                variant="outline"
                size="icon"
                className="justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
                aria-label={t("finalizePublishIdp")}
                title={t("finalizePublishIdp")}
              >
                {finalizeIdpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button 
              onClick={handlePrint}
              size="icon"
              className="justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
              aria-label={t("saveAsPDF")}
              title={t("saveAsPDF")}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleExportToExcel}
              variant="outline"
              size="icon"
              className="justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
              aria-label={t("saveAsExcel")}
              title={t("saveAsExcel")}
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Side Panel - Only visible on desktop, hidden in print */}
          <aside className="hidden lg:block print:hidden">
            <ObjectivesNav 
              objectives={objectives}
              onObjectiveClick={(index) => {
                const element = document.getElementById(`objective-${index}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            />
          </aside>
          
          {/* Main Content Area */}
          <div ref={printRef} className="flex flex-col gap-8">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              {idp.organizationLogo && (
                <img 
                  src={idp.organizationLogo} 
                  alt={t("organizationLogo")} 
                  className="h-12 w-auto object-contain"
                />
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 transition-colors duration-300 hover:text-primary">
              {t("idpReport")}
            </h1>
            <p className="text-muted-foreground">
              {t("reportExecutiveFor", { name: idp.employeeName })} | {t('generatedOn')} {formatReportDate(idp.dateOfIdpCreation)}
            </p>
          </div>

          {reportSections.purposeGuidance && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("purposeGuidance")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                  {rt("Purpose and participant guidance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <PriorityDetail title={rt("Purpose")} value={rt("Use this IDP as a practical working document for leadership growth, manager conversations, and evidence-based progress reviews.")} />
                <PriorityDetail title={rt("How to use this plan")} value={rt("Review the priorities, agree on support, apply the actions in live work, and update progress during each check-in.")} />
                <PriorityDetail title={rt("Review rhythm")} value={rt(idp.reviewPeriod || reviewDateLabel)} />
              </CardContent>
            </Card>
          )}

          {reportSections.leadershipContext && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("leadershipContext")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  {rt("Participant leadership context and aspirations")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <PriorityDetail title={rt("Current leadership context")} value={`${idp.employeeName} · ${idp.position || t("notSpecified")} · ${idp.company}`} />
                <PriorityDetail title={rt("Aspiration or next-role goal")} value={rt((idp as any).aspiration || leadershipSummary.leadershipTheme || t("notSpecified"))} />
                <PriorityDetail title={rt("Program and role lens")} value={enterpriseMetadata?.programmeCompletion === "completed" ? rt("Program learning has been considered alongside role and organization evidence.") : rt("Role, organization, manager, and participant evidence have been considered.")} />
                <PriorityDetail title={rt("Manager partnership")} value={`${idp.directManager || t("notSpecified")} · ${rt("Review progress together and agree support.")}`} />
              </CardContent>
            </Card>
          )}

          {reportSections.growThinkExecuteInspireAssessment && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("growThinkExecuteInspireAssessment")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Target className="h-5 w-5" />
                  {rt("Baseline GROW-THINK-EXECUTE-INSPIRE self-assessment")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {growThinkExecuteInspireItems.map((item) => (
                  <ExecutiveMetric key={item.label} label={item.label} value={item.value} />
                ))}
              </CardContent>
            </Card>
          )}

          {reportSections.evidenceSummary && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("evidenceSummary")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                  {rt("Evidence, strengths, and development gaps")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <SummaryList title={rt("Confirmed evidence")} items={confirmedEvidenceInsights.slice(0, 6).map((insight) => insight.text)} tone="blue" />
                <SummaryList title={rt("Documents considered")} items={sourceFiles.slice(0, 6).map((file) => `${file.name} (${getReportSourceLabel(file.sourceType, t)})`)} tone="primary" />
                <SummaryList title={rt("Strength signals")} items={leadershipSummary.topStrengths || strengths.slice(0, 3).map((item) => item.area)} tone="green" />
                <SummaryList title={rt("Development gaps")} items={leadershipSummary.growthOpportunities || gaps.slice(0, 3).map((item) => item.area)} tone="amber" />
              </CardContent>
            </Card>
          )}

          {reportSections.goalSettingCanvas && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("goalSettingCanvas")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Target className="h-5 w-5" />
                  {rt("Development goal-setting canvas")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                {objectives.map((objective, index) => (
                  <div key={`${objective.title}-${index}`} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-primary">{t("priorityNumber", { number: index + 1, title: objective.title })}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{objective.measurable}</p>
                    <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{rt("Evidence of success")}</p>
                    <p className="mt-1 text-sm text-foreground">{objective.evidenceOfSuccess || objective.measurable}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {reportSections.actionPlan && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("actionPlan")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  {developmentFramework === "70_20_10" ? rt("70-20-10 action plan") : t("developmentActions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                {actionMethodLabels.map((method) => (
                  <SummaryList
                    key={method.title}
                    title={method.title}
                    items={allActionItems.filter((item) => item.method === method.title).slice(0, 5).map((item) => item.item)}
                    tone={method.tone === "green" ? "green" : method.tone === "blue" ? "blue" : "amber"}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {reportSections.hitachiChallenge && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("hitachiChallenge")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Briefcase className="h-5 w-5" />
                  {rt("One Hitachi Group Challenge leadership application")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <PriorityDetail title={rt("Challenge focus")} value={objectives[0]?.expectedBusinessImpact || objectives[0]?.measurable || rt("Apply one development priority to a live business challenge.")} />
                <PriorityDetail title={rt("Leadership behavior to practice")} value={objectives[0]?.title || leadershipSummary.leadershipTheme} />
                <PriorityDetail title={rt("Evidence to collect")} value={objectives[0]?.evidenceOfSuccess || rt("Capture stakeholder feedback, business impact, and visible behavior change.")} />
              </CardContent>
            </Card>
          )}

          {reportSections.masterclassReflectionJournal && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("masterclassReflectionJournal")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                  {rt("Masterclass and MIT xPRO reflection journal")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <SummaryList title={rt("Program reflections")} items={reportManagerGuide.keyLearnings} tone="primary" />
                <SummaryList title={rt("Reflection prompts")} items={[rt("What idea changed my thinking?"), rt("Where did I apply it at work?"), rt("What evidence shows that it mattered?")]} tone="blue" />
              </CardContent>
            </Card>
          )}

          {reportSections.midpointPeerFeedback && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("midpointPeerFeedback")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                  {rt("Midpoint review and peer learning-circle feedback")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <PriorityDetail title={rt("Midpoint review")} value={formatReportDate(nextReviewDate)} />
                <SummaryList title={rt("Peer and manager feedback to collect")} items={[rt("What changed in my leadership behavior?"), rt("What should I continue, stop, or adjust?"), rt("What support would accelerate progress?")]} tone="green" />
              </CardContent>
            </Card>
          )}

          {reportSections.evidenceImpactTracker && (
            <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("evidenceImpactTracker")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                  {rt("Evidence-of-change and impact tracker")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <ExecutiveMetric label={t("overallProgress")} value={`${overallProgress}%`} />
                <ExecutiveMetric label={t("completedCommitments")} value={String(completedObjectives)} />
                <ExecutiveMetric label={t("prioritiesAtRisk")} value={String(atRiskPriorities.length)} />
              </CardContent>
            </Card>
          )}

          {/* IDP Executive Summary */}
          {reportSections.executiveSummary && (
          <Card className="border border-slate-200 shadow-sm page-break-inside-avoid" style={sectionOrderStyle("executiveSummary")}>
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <Target className="h-5 w-5" />
                {t("idpExecutiveSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ExecutiveMetric label={t("role")} value={idp.position || t("notSpecified")} />
                <ExecutiveMetric label={t("manager")} value={idp.directManager || t("notSpecified")} />
                <ExecutiveMetric label={t("overallProgress")} value={`${overallProgress}%`} />
                <ExecutiveMetric label={t("nextReview")} value={formatReportDate(nextReviewDate)} />
                <ExecutiveMetric label={t("lastReviewed")} value={formatReportDate(lastReviewedDate)} />
                <ExecutiveMetric label={t("prioritiesAtRisk")} value={String(atRiskPriorities.length)} />
                <ExecutiveMetric label={t("completedCommitments")} value={String(completedObjectives)} />
                <ExecutiveMetric label={t("developmentFramework")} value={t(
                  developmentFramework === "70_20_10"
                    ? "framework702010"
                    : developmentFramework === "flexible"
                      ? "frameworkFlexible"
                      : developmentFramework === "grow"
                        ? "frameworkGrow"
                      : developmentFramework === "custom"
                        ? "frameworkCustom"
                        : "frameworkExperiencePeopleLearning"
                )} />
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("developmentTheme")}</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{leadershipSummary.leadershipTheme}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("reportFocusSentence", { count: objectives.length, completed: completedObjectives, date: reviewDateLabel })}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SummaryList title={t("topStrengths")} items={leadershipSummary.topStrengths} tone="green" />
                <SummaryList title={t("growthOpportunities")} items={leadershipSummary.growthOpportunities} tone="amber" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SummaryList title={t("threeDevelopmentPriorities")} items={leadershipSummary.threeLeadershipPriorities} tone="primary" />
                <SummaryList title={t("managerSupportNeeded")} items={reportManagerGuide.supportNeeded} tone="blue" />
              </div>
            </CardContent>
          </Card>
          )}

          {/* Employee Information Section */}
          {reportSections.employeeInformation && (
          <Card className="transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("employeeInformation")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                {t('employeeInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("employeeName")}</p>
                      <p className="font-medium text-foreground">{idp.employeeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("position")}</p>
                      <p className="font-medium text-foreground">{idp.position || t("notSpecified")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("company")}</p>
                      <p className="font-medium text-foreground">{idp.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("department")}</p>
                      <p className="font-medium text-foreground">{idp.department || t("notSpecified")}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("yearsOfExperience")}</p>
                      <p className="font-medium text-foreground">{t("yearsValue", { count: idp.yearsOfExperience })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("dateOfJoining")}</p>
                      <p className="font-medium text-foreground">{formatReportDate(idp.dateOfJoining)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("directManager")}</p>
                      <p className="font-medium text-foreground">{idp.directManager || t("notSpecified")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Strengths and Gaps Charts */}
          {reportSections.strengthsAndGaps && (
          <div style={sectionOrderStyle("strengthsAndGaps")}>
          <Suspense
            fallback={
              <div className="grid md:grid-cols-2 gap-6">
                {[t("keyStrengthAreas"), t("keyDevelopmentGaps")].map((title) => (
                  <Card key={title} className="transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-primary">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        {t("loading")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          >
            <StrengthsGapsCharts
              strengths={strengths}
              gaps={gaps}
              strengthColors={strengthColors}
              gapColors={gapColors}
              isRTL={isRTL}
              labels={{
                keyStrengthAreas: t("keyStrengthAreas"),
                keyDevelopmentGaps: t("keyDevelopmentGaps"),
                noStrengthData: t("noStrengthData"),
                noGapData: t("noGapData"),
              }}
            />
          </Suspense>
          </div>
          )}

          {/* Development Priorities Overview */}
          {reportSections.developmentPriorities && (
          <Card className="transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("developmentPriorities")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                {t("developmentPrioritiesOverview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t("developmentPrioritiesIntro")}
              </p>
              <div className="space-y-3">
                {objectives.map((obj, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-3 bg-muted rounded-lg transition-all duration-200 hover:bg-muted/80 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{obj.dimension ? `${obj.dimension}: ` : ""}{obj.title}</p>
                      <p className="text-sm text-muted-foreground">{obj.measurable}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Detailed IDP for Each Objective */}
          {reportSections.developmentPriorities && (
          <>
          {objectives.map((objective, index) => (
            <Card key={index} id={`objective-${index}`} className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg scroll-mt-20" style={sectionOrderStyle("developmentPriorities")}>
              <CardHeader className="bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {t("priorityNumber", { number: index + 1, title: objective.title })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        objective.criticality === "critical" ? "bg-red-100 text-red-800 border border-red-300" :
                        objective.criticality === "high" ? "bg-orange-100 text-orange-800 border border-orange-300" :
                        objective.criticality === "medium" ? "bg-yellow-100 text-yellow-800 border border-yellow-300" :
                        "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}>
                        {t("priorityCriticalityLabel", { level: t(objective.criticality) })}
                      </span>
                      {objective.dimension && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {objective.dimension}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {objective.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {objective.status === "in_progress" && <Clock className="h-5 w-5 text-blue-600" />}
                    {objective.status === "blocked" && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {objective.status === "revised" && <MessageSquare className="h-5 w-5 text-amber-600" />}
                    {objective.status === "not_started" && <Circle className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Progress Tracking */}
                {reportSections.progressTracking && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{t('progressTracking')}</h4>
                    <Button
                      variant={editingObjective === index ? "outline" : "default"}
                      size="icon"
                      className={editingObjective === index ? "" : "bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"}
                      onClick={() => openProgressEditor(index, objective)}
                      aria-label={editingObjective === index ? t("cancel") : t("update")}
                      title={editingObjective === index ? t("cancel") : t("update")}
                    >
                      {editingObjective === index ? <XCircle className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {editingObjective === index ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('status')}</label>
                          <Select
                            value={(progressDrafts[index] || createProgressDraft(objective)).status}
                            onValueChange={(value) => {
                              const status = value as ObjectiveProgressStatus;
                              const progress = status === "completed" ? 100 : status === "in_progress" ? Math.max(objective.progress, 10) : status === "not_started" ? 0 : objective.progress;
                              updateProgressDraft(index, { status, progress });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">{t('notStarted')}</SelectItem>
                              <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                              <SelectItem value="blocked">{t('blocked')}</SelectItem>
                              <SelectItem value="completed">{t('completed')}</SelectItem>
                              <SelectItem value="revised">{t('revised')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('reviewDate')}</label>
                          <Input
                            type="date"
                            value={(progressDrafts[index] || createProgressDraft(objective)).reviewDate?.slice(0, 10) || ""}
                            onChange={(event) => updateProgressDraft(index, { reviewDate: event.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">{t('progress')}</label>
                          <span className="text-sm font-semibold text-primary">{(progressDrafts[index] || createProgressDraft(objective)).progress}%</span>
                        </div>
                        <Slider
                          value={[(progressDrafts[index] || createProgressDraft(objective)).progress]}
                          onValueChange={([value]) => {
                            const status = value === 100 ? "completed" : value > 0 ? "in_progress" : "not_started";
                            updateProgressDraft(index, { progress: value, status });
                          }}
                          max={100}
                          step={5}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t('dragSliderToUpdate')}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>{t("latestReflection")}</Label>
                          <Textarea
                            value={(progressDrafts[index] || createProgressDraft(objective)).latestReflection}
                            onChange={(event) => updateProgressDraft(index, { latestReflection: event.target.value })}
                            rows={3}
                            className="mt-2 resize-none"
                          />
                        </div>
                        <div>
                          <Label>{t("managerFeedback")}</Label>
                          <Textarea
                            value={(progressDrafts[index] || createProgressDraft(objective)).managerFeedback}
                            onChange={(event) => updateProgressDraft(index, { managerFeedback: event.target.value })}
                            rows={3}
                            className="mt-2 resize-none"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>{t("evidenceUploaded")}</Label>
                          <Textarea
                            value={(progressDrafts[index] || createProgressDraft(objective)).evidenceUploadedText}
                            onChange={(event) => updateProgressDraft(index, { evidenceUploadedText: event.target.value })}
                            placeholder={t("evidenceUploadedPlaceholder")}
                            rows={3}
                            className="mt-2 resize-none"
                          />
                        </div>
                        <div>
                          <Label>{t("nextAction")}</Label>
                          <Textarea
                            value={(progressDrafts[index] || createProgressDraft(objective)).nextAction}
                            onChange={(event) => updateProgressDraft(index, { nextAction: event.target.value })}
                            rows={3}
                            className="mt-2 resize-none"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h5 className="font-semibold text-foreground">{t("checkInQuestions")}</h5>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {[
                            ["whatTried", t("whatDidITry")],
                            ["whatHappened", t("whatHappened")],
                            ["whatChanged", t("whatChanged")],
                            ["whatGotInTheWay", t("whatGotInTheWay")],
                            ["whatNext", t("whatWillIDoNext")],
                            ["supportNeeded", t("whatSupportDoINeed")],
                          ].map(([field, label]) => (
                            <div key={field}>
                              <Label>{label}</Label>
                              <Textarea
                                value={(progressDrafts[index] || createProgressDraft(objective)).checkIn[field as keyof ProgressDraft["checkIn"]]}
                                onChange={(event) => updateCheckInDraft(index, field as keyof ProgressDraft["checkIn"], event.target.value)}
                                rows={2}
                                className="mt-2 resize-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingObjective(null)}
                          aria-label={t("cancel")}
                          title={t("cancel")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => saveProgressDraft(index)}
                          disabled={updateStatusMutation.isPending}
                          aria-label={t("saveProgressUpdate")}
                          title={t("saveProgressUpdate")}
                        >
                          {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('status')}:</span>
                        <span className={
                          objective.status === "completed" ? "text-green-600 font-medium" :
                          objective.status === "in_progress" ? "text-blue-600 font-medium" :
                          objective.status === "blocked" ? "text-red-600 font-medium" :
                          objective.status === "revised" ? "text-amber-600 font-medium" :
                          "text-gray-500 font-medium"
                        }>
                          {objective.status === "completed" ? t('completed') :
                           objective.status === "in_progress" ? t('inProgress') :
                           objective.status === "blocked" ? t("blocked") :
                           objective.status === "revised" ? t("revised") :
                           t('notStarted')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('progress')}</span>
                          <span className="font-semibold">{objective.progress}%</span>
                        </div>
                        <Progress value={objective.progress} className="h-2" />
                      </div>
                      {objective.deadline && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('deadline')}:</span>
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatReportDate(objective.deadline)}
                          </span>
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-2">
                        <ProgressDetail label={t("latestReflection")} value={objective.latestReflection} />
                        <ProgressDetail label={t("managerFeedback")} value={objective.managerFeedback} />
                        <ProgressDetail label={t("nextAction")} value={objective.nextAction} />
                        <ProgressDetail label={t("reviewDate")} value={objective.reviewDate ? formatReportDate(objective.reviewDate) : undefined} />
                      </div>
                      {(objective.checkIns?.length || 0) > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t("checkInsRecorded", { count: objective.checkIns?.length || 0 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                )}

                <Separator />
                {/* Description */}
                <div className="p-3 rounded-lg transition-all duration-200 hover:bg-muted">
                  <h4 className="font-semibold text-foreground mb-2">{t('objectiveDescription')}</h4>
                  <p className="text-muted-foreground">{objective.description}</p>
                </div>

                {/* Measurable Success Criteria */}
                <div className="p-3 rounded-lg transition-all duration-200 hover:bg-muted">
                  <h4 className="font-semibold text-foreground mb-2">{t('successMetrics')}</h4>
                  <p className="text-muted-foreground">{objective.measurable}</p>
                </div>

                <Separator />

                {/* Leadership Priority Detail */}
                <div className="grid gap-4 md:grid-cols-2">
                  <PriorityDetail
                    title={t("whyThisMatters")}
                    value={objective.whyThisMatters || objective.description}
                  />
                  <PriorityDetail
                    title={t("expectedBusinessImpact")}
                    value={objective.expectedBusinessImpact || objective.measurable}
                  />
                </div>

                {reportSections.actionPlan && (
                <div>
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
	                    <div>
	                      <h4 className="font-semibold text-foreground">{t("developmentActions")}</h4>
	                      <p className="text-sm text-muted-foreground">{t(
	                        developmentFramework === "70_20_10"
	                          ? "structuredConfigured702010"
                            : developmentFramework === "grow"
                              ? "structuredGrow"
	                          : "structuredExperiencePeopleLearning"
	                      )}</p>
	                    </div>
	                  </div>
	                  <div className="grid gap-4 lg:grid-cols-3">
	                    {actionMethodLabels.map((method) => (
	                      <ActionMethodCard
	                        key={method.title}
	                        title={method.title}
	                        subtitle={method.subtitle}
	                        items={asList(
	                          objective.recommendations?.[method.key as keyof Objective["recommendations"]],
	                          method.key === "experiential"
	                            ? (objective.recommendedActions || []).slice(0, 2)
	                            : method.key === "social"
	                              ? (objective.recommendedActions || []).slice(2, 4)
	                              : (objective.recommendedActions || []).slice(4, 6)
	                        )}
	                        tone={method.tone}
	                      />
	                    ))}
                  </div>
                </div>
                )}

	                <div className="grid gap-4 md:grid-cols-2">
	                  <PriorityDetail
	                    title={t("evidenceOfSuccess")}
	                    value={objective.evidenceOfSuccess || t("defaultEvidenceOfSuccess")}
	                  />
	                  <PriorityDetail
	                    title={t("targetReviewDate")}
	                    value={objective.targetReviewDate ? formatReportDate(objective.targetReviewDate) : t("reviewIn90Days")}
	                  />
	                </div>
	                {reportSections.evidenceSummary && (objective.sourceEvidence?.length || 0) > 0 && (
	                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
	                    <h4 className="font-semibold text-foreground">{t("evidenceIndicators")}</h4>
	                    <div className="mt-3 grid gap-3 md:grid-cols-2">
	                      {objective.sourceEvidence?.map((source, sourceIndex) => (
	                        <div key={`${source.sourceType}-${sourceIndex}`} className="rounded-md border border-slate-200 bg-white p-3">
	                          <div className="mb-2 flex flex-wrap items-center gap-2">
	                            <Badge variant="outline">{getReportSourceLabel(source.sourceType, t)}</Badge>
	                            {reportConfiguration.showEvidenceConfidence !== false && (
                                <>
	                                <Badge variant="outline">{t(source.confidence)}</Badge>
	                                {source.userConfirmed ? <Badge className="bg-emerald-700">{t("userConfirmed")}</Badge> : null}
	                                {source.aiInferred ? <Badge variant="secondary">{t("aiInferred")}</Badge> : null}
                                </>
                              )}
	                          </div>
	                          <p className="text-sm leading-6 text-muted-foreground">{source.sourceReference}</p>
	                        </div>
	                      ))}
	                    </div>
	                  </div>
	                )}
	              </CardContent>
	            </Card>
	          ))}
          </>
          )}

          {/* Personal Commitments */}
          {reportSections.personalLeadershipCommitment && commitments && (
            <Card className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("personalLeadershipCommitment")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  {t("personalCommitments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <CommitmentCard title={t("iWillStart")} value={commitments.start} />
                  <CommitmentCard title={t("iWillStop")} value={commitments.stop} />
                  <CommitmentCard title={t("iWillContinue")} value={commitments.continue} />
                  <CommitmentCard title={t("iWillExperiment")} value={commitments.experiment} />
                </div>
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-primary">{t("successWillLookLike")}</p>
                  <p className="mt-2 text-foreground">{commitments.success}</p>
                  {commitments.reviewDate && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {t("reviewDate")}: {formatReportDate(commitments.reviewDate)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 30-60-90 Day Plan */}
          {reportSections.continuationPlan && (
	          <Card className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("continuationPlan")}>
	            <CardHeader>
	              <CardTitle className="flex items-center gap-2 text-primary">
	                <Calendar className="h-5 w-5" />
                {t("actionPlanTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <RoadmapColumn title={t("days30")} subtitle={t("roadmap30Subtitle")} items={roadmapPlan.thirtyDays} />
                <RoadmapColumn title={t("days60")} subtitle={t("roadmap60Subtitle")} items={roadmapPlan.sixtyDays} />
                <RoadmapColumn title={t("days90")} subtitle={t("roadmap90Subtitle")} items={roadmapPlan.ninetyDays} />
	              </div>
	            </CardContent>
	          </Card>
          )}

          {reportSections.managerGuide && (
          <div className="flex flex-col gap-8" style={sectionOrderStyle("managerGuide")}>
	          <ManagerReviewSection
	            managerReview={managerReview}
	            objectives={objectives}
	            objectiveIndex={managerReviewObjectiveIndex}
	            comment={managerReviewComment}
	            suggestedValue={managerSuggestedValue}
	            reviewDates={managerReviewDates}
	            summaryComment={managerSummaryComment}
	            isSubmitting={
	              submitForManagerReviewMutation.isPending ||
	              addManagerReviewInputMutation.isPending ||
	              resolveManagerEditMutation.isPending ||
	              markManagerReviewedMutation.isPending ||
	              agreeReviewDatesMutation.isPending
	            }
	            onObjectiveIndexChange={setManagerReviewObjectiveIndex}
	            onCommentChange={setManagerReviewComment}
	            onSuggestedValueChange={setManagerSuggestedValue}
	            onReviewDatesChange={setManagerReviewDates}
	            onSummaryCommentChange={setManagerSummaryComment}
	            onSubmitForReview={() => submitForManagerReviewMutation.mutate({ idpId })}
	            onAddInput={handleAddManagerReviewInput}
	            onResolveEdit={(editId, status) => resolveManagerEditMutation.mutate({ idpId, editId, status })}
	            onSaveReviewDates={handleSaveReviewDates}
	            onMarkReviewed={() => markManagerReviewedMutation.mutate({ idpId, managerSummaryComment })}
	          />

	          {/* Manager Discussion Guide */}
	          <Card className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                {t("managerDiscussionGuide")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryList title={t("keyLearnings")} items={reportManagerGuide.keyLearnings} tone="primary" />
                <SummaryList title={t("supportNeeded")} items={reportManagerGuide.supportNeeded} tone="blue" />
                <SummaryList title={t("resourcesRequired")} items={reportManagerGuide.resourcesRequired} tone="amber" />
                <SummaryList title={t("questionsForManager")} items={reportManagerGuide.questionsForManager} tone="green" />
              </div>
              <div className="mt-4">
                <SummaryList title={t("discussionAgenda")} items={reportManagerGuide.discussionAgenda} tone="primary" />
              </div>
            </CardContent>
          </Card>
          </div>
          )}

          {/* GROW Model Section */}
          {reportSections.growModel && rawGrowModel && Object.keys(rawGrowModel).length > 0 && (
            <div style={sectionOrderStyle("growModel")}>
              <GrowModelDiagram
                goal={growModel.goal}
                reality={growModel.reality}
                options={growModel.options}
                willDo={growModel.willDo}
              />
            </div>
          )}

          {/* Summary Section */}
          {reportSections.finalIntegratedReflection && (
          <Card className="border-2 border-primary/20 shadow-lg" style={sectionOrderStyle("finalIntegratedReflection")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                {rt("Final integrated reflection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-foreground leading-relaxed text-lg">
                {summaryAdvice || t("noSummaryAvailable")}
              </p>
            </CardContent>
          </Card>
          )}

          {/* Executive Education Section */}
          {reportSections.learningRecommendations && (
          <Card className="transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("learningRecommendations")}>
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardTitle className="text-xl text-center">
                {t('executiveEducationQuestion')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-6">
                {t('executiveEducationDescription')}
              </p>
              <a 
                href="https://enterprisecatelog.emeritus.org/search/enterprise-catalog?page=1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="icon"
                  className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  aria-label={t("browseExecutiveEducationCatalog")}
                  title={t("browseExecutiveEducationCatalog")}
                >
                  <BookOpen className="h-5 w-5" />
                </Button>
              </a>
            </CardContent>
          </Card>
          )}

          {/* Learning Resources */}
          {reportSections.learningRecommendations && (
          <div style={sectionOrderStyle("learningRecommendations")}>
            <LearningResources 
              key={`learning-${idpId}-${selectedLanguage}`}
              idpId={idpId} 
              objectives={objectives}
              existingResources={localizedLearningResources}
            />
          </div>
          )}

          {reportSections.seniorLeaderWitness && (
            <Card className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("seniorLeaderWitness")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <PenTool className="h-5 w-5" />
                  {rt("Senior-leader witness section")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <PriorityDetail title={rt("Witness name and role")} value={rt("To be completed during the final leadership review.")} />
                <PriorityDetail title={rt("Witness observation")} value={rt("Summarize visible behavior change, business impact, and continued support required.")} />
                <div className="rounded-lg border border-dashed border-slate-300 p-6">
                  <p className="text-sm font-semibold text-foreground">{rt("Senior leader signature")}</p>
                  <div className="mt-8 border-t border-slate-300 pt-2 text-xs text-muted-foreground">{rt("Signature and date")}</div>
                </div>
                <div className="rounded-lg border border-dashed border-slate-300 p-6">
                  <p className="text-sm font-semibold text-foreground">{rt("Participant acknowledgement")}</p>
                  <div className="mt-8 border-t border-slate-300 pt-2 text-xs text-muted-foreground">{rt("Signature and date")}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Section */}
          {reportSections.signatures && (
          <Card className="transition-all duration-300 hover:shadow-lg" style={sectionOrderStyle("signatures")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <PenTool className="h-5 w-5" />
                {t('approvalSignatures')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Employee Signature */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">{t('employeeSignature')}</h4>
                  {idp.employeeSignature ? (
                    <div className="space-y-2">
                      <div className="border-2 border-border rounded-lg p-4 bg-background">
                        <img 
                          src={idp.employeeSignature} 
                          alt={t("employeeSignature")} 
                          className="w-full h-32 object-contain"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t("signedBy")}: {idp.employeeName}</p>
                        <p>{t("date")}: {idp.employeeSignedAt ? formatReportDate(idp.employeeSignedAt) : t("notAvailable")}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowEmployeeSignature(true)}
                        aria-label={t("updateSignature")}
                        title={t("updateSignature")}
                      >
                        <PenTool className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {showEmployeeSignature ? (
                        <SignaturePad
                          title={t("signAsEmployee")}
                          onSave={(signature) => {
                            saveSignatureMutation.mutate({
                              idpId,
                              signatureType: "employee",
                              signatureData: signature,
                            });
                          }}
                          onCancel={() => setShowEmployeeSignature(false)}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowEmployeeSignature(true)}
                          aria-label={t("signAsEmployee")}
                          title={t("signAsEmployee")}
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Manager Signature */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">{t('managerSignature')}</h4>
                  {idp.managerSignature ? (
                    <div className="space-y-2">
                      <div className="border-2 border-border rounded-lg p-4 bg-background">
                        <img 
                          src={idp.managerSignature} 
                          alt={t("managerSignature")} 
                          className="w-full h-32 object-contain"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t("signedBy")}: {idp.directManager}</p>
                        <p>{t("date")}: {idp.managerSignedAt ? formatReportDate(idp.managerSignedAt) : t("notAvailable")}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowManagerSignature(true)}
                        aria-label={t("updateSignature")}
                        title={t("updateSignature")}
                      >
                        <PenTool className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {showManagerSignature ? (
                        <SignaturePad
                          title={t("signAsManager")}
                          onSave={(signature) => {
                            saveSignatureMutation.mutate({
                              idpId,
                              signatureType: "manager",
                              signatureData: signature,
                            });
                          }}
                          onCancel={() => setShowManagerSignature(false)}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowManagerSignature(true)}
                          aria-label={t("signAsManager")}
                          title={t("signAsManager")}
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
	            </CardContent>
	          </Card>
          )}

	          {/* Footer for PDF */}
          <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
            <p>{t("reportFooterCreated")}</p>
            <p className="mt-1">© {new Date().getFullYear()} Emeritus - {t("emeritusTagline")}</p>
          </div>
          </div>
        </div>
      </main>

      {/* Reflection Support Assistant */}
      {objectives.length > 0 && showChatbot && (
        <CoachingAssistant idpId={idpId} objectives={objectives} />
      )}
    </div>
  );
}

function ExecutiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function ManagerReviewSection({
  managerReview,
  objectives,
  objectiveIndex,
  comment,
  suggestedValue,
  reviewDates,
  summaryComment,
  isSubmitting,
  onObjectiveIndexChange,
  onCommentChange,
  onSuggestedValueChange,
  onReviewDatesChange,
  onSummaryCommentChange,
  onSubmitForReview,
  onAddInput,
  onResolveEdit,
  onSaveReviewDates,
  onMarkReviewed,
}: {
  managerReview: ManagerReview;
  objectives: Objective[];
  objectiveIndex: string;
  comment: string;
  suggestedValue: string;
  reviewDates: string;
  summaryComment: string;
  isSubmitting: boolean;
  onObjectiveIndexChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onSuggestedValueChange: (value: string) => void;
  onReviewDatesChange: (value: string) => void;
  onSummaryCommentChange: (value: string) => void;
  onSubmitForReview: () => void;
  onAddInput: () => void;
  onResolveEdit: (editId: string, status: "accepted" | "rejected") => void;
  onSaveReviewDates: () => void;
  onMarkReviewed: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="page-break-inside-avoid transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <MessageSquare className="h-5 w-5" />
          {t("managerReview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <ExecutiveMetric label={t("managerReviewStatus")} value={t(`managerReviewStatus_${managerReview.status}`)} />
          <ExecutiveMetric label={t("submitted")} value={managerReview.submittedAt ? new Date(managerReview.submittedAt).toLocaleDateString() : t("notSpecified")} />
          <ExecutiveMetric label={t("reviewed")} value={managerReview.reviewedAt ? new Date(managerReview.reviewedAt).toLocaleDateString() : t("notSpecified")} />
          <ExecutiveMetric label={t("agreedReviewDates")} value={String(managerReview.agreedReviewDates?.length || 0)} />
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            type="button"
            onClick={onSubmitForReview}
            disabled={isSubmitting}
            variant="outline"
            size="icon"
            aria-label={t("submitForManagerReview")}
            title={t("submitForManagerReview")}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onMarkReviewed}
            disabled={isSubmitting}
            size="icon"
            aria-label={t("markManagerReviewed")}
            title={t("markManagerReviewed")}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 print:hidden">
          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="font-semibold text-foreground">{t("managerCommentsAndEdits")}</h4>
            <div className="mt-3 space-y-3">
              <Select value={objectiveIndex} onValueChange={onObjectiveIndexChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {objectives.map((objective, index) => (
                    <SelectItem key={`${objective.title}-${index}`} value={String(index)}>
                      {t("priorityNumber", { number: index + 1, title: objective.title })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder={t("managerCommentPlaceholder")} rows={3} className="resize-none" />
              <Textarea value={suggestedValue} onChange={(event) => onSuggestedValueChange(event.target.value)} placeholder={t("managerSuggestedEditPlaceholder")} rows={3} className="resize-none" />
              <Button
                type="button"
                onClick={onAddInput}
                disabled={isSubmitting}
                size="icon"
                aria-label={t("addManagerInput")}
                title={t("addManagerInput")}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="font-semibold text-foreground">{t("reviewCadence")}</h4>
            <Textarea value={reviewDates} onChange={(event) => onReviewDatesChange(event.target.value)} placeholder={t("reviewDatesPlaceholder")} rows={4} className="mt-3 resize-none" />
            <Button
              type="button"
              onClick={onSaveReviewDates}
              disabled={isSubmitting}
              size="icon"
              className="mt-3"
              aria-label={t("saveReviewDates")}
              title={t("saveReviewDates")}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Textarea value={summaryComment} onChange={(event) => onSummaryCommentChange(event.target.value)} placeholder={t("managerSummaryCommentPlaceholder")} rows={3} className="mt-3 resize-none" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SummaryList
            title={t("managerComments")}
            items={(managerReview.comments || []).map((item) => `${t("priority")} ${item.objectiveIndex + 1}: ${item.comment}`)}
            tone="blue"
          />
          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="font-semibold text-foreground">{t("managerSuggestedEdits")}</h4>
            {(managerReview.suggestedEdits || []).length > 0 ? (
              <div className="mt-3 space-y-3">
                {managerReview.suggestedEdits.map((edit) => (
                  <div key={edit.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-medium text-foreground">{t("priority")} {edit.objectiveIndex + 1}: {edit.field}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{edit.suggestedValue}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
                      <Badge variant="outline">{t(edit.status)}</Badge>
                      {edit.status === "pending" && (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => onResolveEdit(edit.id, "accepted")}
                            aria-label={t("accept")}
                            title={t("accept")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onResolveEdit(edit.id, "rejected")}
                            aria-label={t("reject")}
                            title={t("reject")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{t("notSpecifiedYet")}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionMethodCard({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: string[];
  tone: "green" | "blue" | "amber";
}) {
  const { t } = useTranslation();
  const toneClass = {
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
    blue: "border-cyan-100 bg-cyan-50/70 text-cyan-800",
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
  }[tone];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className={`border-b px-4 py-3 ${toneClass}`}>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
      <div className="p-4">
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{t("addActionDuringReview")}</p>
        )}
      </div>
    </div>
  );
}

function SummaryList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "primary" | "green" | "amber" | "blue";
}) {
  const { t } = useTranslation();
  const toneClass = {
    primary: "bg-primary/5 border-primary/20 text-primary",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <h4 className="font-semibold">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("notSpecifiedYet")}</p>
      )}
    </div>
  );
}

function PriorityDetail({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function ProgressDetail({ label, value }: { label: string; value?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value?.trim() || t("notSpecifiedYet")}</p>
    </div>
  );
}

function CommitmentCard({ title, value }: { title: string; value?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value || t("notSpecifiedYet")}</p>
    </div>
  );
}

function RoadmapColumn({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-lg font-bold text-primary">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
