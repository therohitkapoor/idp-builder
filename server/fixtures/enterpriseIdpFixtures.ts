import { createEmptyEnterpriseContextInputs, type EnterpriseContextInputs, type IdpMode, type SupportingSourceType } from "@shared/idpEnterprise";

export type EnterpriseFixture = {
  mode: IdpMode;
  supportingSources: SupportingSourceType[];
  employeeDetails: {
    employeeName: string;
    position: string;
    company: string;
    department: string;
    yearsOfExperience: number;
    dateOfJoining: Date | null;
    dateOfIdpCreation: Date;
    directManager: string;
  };
  contextInputs: EnterpriseContextInputs;
  aspiration: string;
  reviewPeriod: string;
};

const baseContext = () => createEmptyEnterpriseContextInputs();

export const assessmentBasedFixture = (): EnterpriseFixture => {
  const context = baseContext();
  context.assessments = [
    {
      id: "assessment-hogan-1",
      assessmentType: "Hogan leadership assessment",
      provider: "Hogan",
      assessmentDate: "2026-06-15",
      summary:
        "Strong execution discipline; opportunity to slow down decision making under pressure; stakeholder influence needs more structure.",
      files: [],
    },
  ];
  context.manager = {
    ...context.manager,
    agreedDevelopmentGoals: "Improve stakeholder influence; build more deliberate delegation rhythm",
    strengthsIdentified: "High ownership; resilient execution; strong follow-through",
    developmentAreasIdentified: "Strategic framing; delegation; executive communication",
    reviewCadence: "Monthly",
  };
  context.participant = {
    ...context.participant,
    careerAspiration: "Move into a regional operations leadership role",
    desiredBusinessImpact: "Reduce avoidable escalations and improve cross-functional planning quality",
  };

  return {
    mode: "assessment_based",
    supportingSources: ["assessment", "manager_notes", "participant_goals"],
    employeeDetails: {
      employeeName: "Aisha Khan",
      position: "Operations Manager",
      company: "Emeritus",
      department: "Learning Operations",
      yearsOfExperience: 8,
      dateOfJoining: null,
      dateOfIdpCreation: new Date("2026-07-13"),
      directManager: "Rohit Kapoor",
    },
    contextInputs: context,
    aspiration: "Regional operations leadership role",
    reviewPeriod: "90 days",
  };
};

export const programBasedFixture = (): EnterpriseFixture => {
  const context = baseContext();
  context.program = {
    ...context.program,
    programName: "Enterprise Leadership Accelerator",
    objectives: "Lead through ambiguity; improve stakeholder alignment; coach teams through change",
    moduleThemes: "Adaptive leadership; strategic influence; coaching conversations",
    keyCompetencies: "Leading Self; Leading Team; Leading Business",
    facultyCoachNotes: "Participant showed strong self-awareness and needs more practice translating insight into stakeholder action.",
    learningSummary: "Most useful takeaway was converting leadership intent into weekly behavior experiments.",
  };
  context.participant = {
    ...context.participant,
    developmentPriorities: "Delegate outcomes; strengthen stakeholder communication; connect team work to business metrics",
    currentChallenges: "Too many escalations come back to the participant instead of being owned by the team.",
  };

  return {
    mode: "program_based",
    supportingSources: ["program", "participant_goals"],
    employeeDetails: {
      employeeName: "Marcus Lee",
      position: "Senior Product Lead",
      company: "Acme APAC",
      department: "Digital Products",
      yearsOfExperience: 11,
      dateOfJoining: new Date("2020-03-02"),
      dateOfIdpCreation: new Date("2026-07-13"),
      directManager: "Priya Raman",
    },
    contextInputs: context,
    aspiration: "Lead a multi-market product portfolio",
    reviewPeriod: "120 days",
  };
};

export const roleBasedFixture = (): EnterpriseFixture => {
  const context = baseContext();
  context.roleOrganization = {
    ...context.roleOrganization,
    futureRoleExpectations:
      "Own regional strategy, influence senior stakeholders, coach managers, and create measurable business impact through operating cadence.",
    successMeasures:
      "Improved forecast accuracy; stronger stakeholder satisfaction; succession-ready team members; fewer escalations.",
  };
  context.participant = {
    ...context.participant,
    careerAspiration: "Future country manager role",
    desiredBusinessImpact: "Improve commercial planning quality and team readiness for expansion.",
  };

  return {
    mode: "role_based",
    supportingSources: ["job_description", "competency_framework", "strategic_priorities", "participant_goals"],
    employeeDetails: {
      employeeName: "Nadia Chen",
      position: "Commercial Director",
      company: "Northstar Health",
      department: "APAC Commercial",
      yearsOfExperience: 14,
      dateOfJoining: new Date("2018-09-10"),
      dateOfIdpCreation: new Date("2026-07-13"),
      directManager: "Daniel Wu",
    },
    contextInputs: context,
    aspiration: "Country manager role",
    reviewPeriod: "6 months",
  };
};

export const comprehensiveFixture = (): EnterpriseFixture => {
  const assessment = assessmentBasedFixture();
  const program = programBasedFixture();
  const role = roleBasedFixture();
  return {
    mode: "comprehensive",
    supportingSources: [
      "assessment",
      "program",
      "job_description",
      "competency_framework",
      "manager_notes",
      "participant_goals",
      "organization_goals",
    ],
    employeeDetails: {
      ...assessment.employeeDetails,
      employeeName: "Sofia Martins",
      position: "Regional Customer Success Leader",
      company: "GlobalTech",
      department: "Customer Success APAC",
      directManager: "Helen Tan",
    },
    contextInputs: {
      ...assessment.contextInputs,
      program: program.contextInputs.program,
      roleOrganization: role.contextInputs.roleOrganization,
      participant: {
        ...assessment.contextInputs.participant,
        ...role.contextInputs.participant,
        developmentPriorities: "Executive influence; scalable delegation; measurable customer impact",
      },
    },
    aspiration: "Vice President of Customer Success",
    reviewPeriod: "6 months",
  };
};
