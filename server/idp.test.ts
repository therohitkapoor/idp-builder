import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  assessmentBasedFixture,
  comprehensiveFixture,
  programBasedFixture,
  roleBasedFixture,
  type EnterpriseFixture,
} from "./fixtures/enterpriseIdpFixtures";
import type { User } from "../drizzle/schema";

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "test-key",
    url: "https://example.com/test-file.pdf",
  }),
}));

const mockParticipantUser: User = {
  id: 9002,
  openId: "local:user@idp.local",
  name: "IDP Participant",
  email: "user@idp.local",
  loginMethod: "credentials",
  role: "user",
  organizationId: null,
  organizationName: null,
  participantId: null,
  createdAt: new Date("2026-07-15T00:00:00.000Z"),
  updatedAt: new Date("2026-07-15T00:00:00.000Z"),
  lastSignedIn: new Date("2026-07-15T00:00:00.000Z"),
};

const otherParticipantUser: User = {
  ...mockParticipantUser,
  id: 9003,
  openId: "local:other@idp.local",
  name: "Other Participant",
  email: "other@idp.local",
};

function createMockContext(user: User | null = mockParticipantUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("idp protected access", () => {
  it("should reject unauthenticated file uploads", async () => {
    const caller = appRouter.createCaller(createMockContext(null));

    await expect(
      caller.idp.uploadFile({
        filename: "test-document.pdf",
        contentType: "application/pdf",
        base64Data: "dGVzdA==",
      })
    ).rejects.toThrow(/please login|unauthorized/i);
  });
});

describe("idp.uploadFile", () => {
  it("should upload a file and return file info", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.idp.uploadFile({
      filename: "test-document.pdf",
      contentType: "application/pdf",
      base64Data: "dGVzdCBjb250ZW50", // "test content" in base64
    });

    expect(result).toHaveProperty("name", "test-document.pdf");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("key");
  });
});

describe("idp router input validation", () => {
  it("should validate file upload input schema", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.idp.uploadFile({
        filename: "",
        contentType: "",
        base64Data: "",
      })
    ).rejects.toThrow();
  });

  it("should accept valid file upload input", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Valid input should not throw validation errors
    const result = await caller.idp.uploadFile({
      filename: "valid-file.pdf",
      contentType: "application/pdf",
      base64Data: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      sourceType: "assessment",
      fileSize: 11,
    });

    expect(result.name).toBe("valid-file.pdf");
    expect(result.sourceType).toBe("assessment");
    expect(result.size).toBe(11);
  });

  it("should reject unsupported file types", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.idp.uploadFile({
        filename: "payload.exe",
        contentType: "application/octet-stream",
        base64Data: "SGVsbG8=",
        fileSize: 5,
      })
    ).rejects.toThrow(/Unsupported file type/);
  });
});

describe("idp.getIdp", () => {
  it("should throw error for non-existent IDP", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Non-existent ID should throw
    await expect(
      caller.idp.getIdp({ id: 999999 })
    ).rejects.toThrow();
  });
});

async function generateEnterpriseIdp(fixture: EnterpriseFixture) {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  const extracted = await caller.idp.extractInsights({
    employeeDetails: fixture.employeeDetails,
    idpMode: fixture.mode,
    supportingSources: fixture.supportingSources,
    sourceFiles: [],
    contextInputs: fixture.contextInputs,
    aspiration: fixture.aspiration,
  });

  const confirmedInsights = extracted.insights.map((insight) => ({
    ...insight,
    userConfirmed: true,
  }));

  const generated = await caller.idp.generateIdp({
    employeeDetails: fixture.employeeDetails,
    uploadedFiles: [],
    sourceFiles: [],
    manualInput: "Enterprise fixture generation",
    organizationLogo: "",
    language: "en",
    idpMode: fixture.mode,
    supportingSources: fixture.supportingSources,
    contextInputs: fixture.contextInputs,
    extractedInsights: extracted.insights,
    confirmedInsights,
    developmentFramework: "experience_people_learning",
    organizationConfig: {
      organizationName: fixture.employeeDetails.company,
      approvedDevelopmentFramework: "experience_people_learning",
    },
    aspiration: fixture.aspiration,
    reviewPeriod: fixture.reviewPeriod,
  });

  return { caller, extracted, generated };
}

describe("enterprise IDP modes", () => {
  it.each([
    ["assessment", assessmentBasedFixture],
    ["program", programBasedFixture],
    ["role", roleBasedFixture],
    ["comprehensive", comprehensiveFixture],
  ])("should create a %s enterprise IDP", async (_label, fixtureFactory) => {
    const fixture = fixtureFactory();
    const { caller, extracted, generated } = await generateEnterpriseIdp(fixture);

    expect(extracted.insights.length).toBeGreaterThan(0);
    expect(generated.id).toBeGreaterThan(0);
    expect(generated.objectives).toHaveLength(3);
    expect(generated.idpMode).toBe(fixture.mode);
    expect(generated.developmentFramework).toBe("experience_people_learning");

    const idp = await caller.idp.getIdp({ id: generated.id });
    expect(idp.idpMode).toBe(fixture.mode);
    expect(idp.confirmedInsights?.length).toBeGreaterThan(0);
    expect(idp.objectives).toHaveLength(3);
    expect((idp.objectives as any[])[0].sourceEvidence).toBeDefined();
  });

  it("should prevent another participant from opening a generated IDP directly", async () => {
    const { generated } = await generateEnterpriseIdp(programBasedFixture());
    const otherCaller = appRouter.createCaller(createMockContext(otherParticipantUser));

    await expect(otherCaller.idp.getIdp({ id: generated.id })).rejects.toThrow(/access/i);
  });
});

describe("enterprise document source handling", () => {
  it("should categorize assessment, job description, and competency framework uploads", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const assessment = await caller.idp.uploadFile({
      filename: "Hogan Report.pdf",
      contentType: "application/pdf",
      base64Data: "SG9nYW4=",
      sourceType: "assessment",
      fileSize: 5,
    });
    const jobDescription = await caller.idp.uploadFile({
      filename: "job-description.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      base64Data: "Sm9i",
      sourceType: "job_description",
      fileSize: 3,
    });
    const competency = await caller.idp.uploadFile({
      filename: "competency-framework.txt",
      contentType: "text/plain",
      base64Data: "Q29tcGV0ZW5jeQ==",
      sourceType: "competency_framework",
      fileSize: 10,
    });

    expect(assessment.sourceType).toBe("assessment");
    expect(jobDescription.sourceType).toBe("job_description");
    expect(competency.sourceType).toBe("competency_framework");
    expect(assessment.url).not.toContain("base64");
  });
});

describe("enterprise progress and manager review", () => {
  it("should update progress, check-ins, and manager review state", async () => {
    const { caller, generated } = await generateEnterpriseIdp(comprehensiveFixture());

    const progressResult = await caller.idp.updateObjectiveStatus({
      idpId: generated.id,
      objectiveIndex: 0,
      status: "blocked",
      progress: 35,
      latestReflection: "Tried a stakeholder alignment meeting but decision rights remain unclear.",
      managerFeedback: "Clarify decision owners before the next meeting.",
      nextAction: "Create a decision-rights map with the manager.",
      reviewDate: "2026-08-15",
      checkIn: {
        whatTried: "Stakeholder alignment meeting",
        whatHappened: "The group agreed on priorities but not decision ownership",
        whatChanged: "The participant identified a clearer blocker",
        whatGotInTheWay: "Decision rights were unclear",
        whatNext: "Create a decision-rights map",
        supportNeeded: "Manager sponsorship",
      },
    });

    expect(progressResult.objectives[0].status).toBe("blocked");
    expect(progressResult.objectives[0].checkIns).toHaveLength(1);

    const submitted = await caller.idp.submitForManagerReview({ idpId: generated.id });
    expect(submitted.managerReview.status).toBe("submitted");

    const managerInput = await caller.idp.addManagerReviewInput({
      idpId: generated.id,
      objectiveIndex: 0,
      comment: "Good direction, but make the next action more specific.",
      suggestedEdit: {
        field: "nextAction",
        currentValue: "Create a decision-rights map with the manager.",
        suggestedValue: "Share a one-page decision-rights map with three named stakeholders by Friday.",
      },
    });
    expect(managerInput.managerReview.suggestedEdits).toHaveLength(1);

    const editId = managerInput.managerReview.suggestedEdits[0].id;
    const resolved = await caller.idp.resolveManagerEdit({
      idpId: generated.id,
      editId,
      status: "accepted",
    });
    expect(resolved.managerReview.suggestedEdits[0].status).toBe("accepted");

    const dates = await caller.idp.agreeReviewDates({
      idpId: generated.id,
      reviewDates: ["2026-08-15", "2026-09-15"],
    });
    expect(dates.managerReview.agreedReviewDates).toHaveLength(2);

    const reviewed = await caller.idp.markManagerReviewed({
      idpId: generated.id,
      managerSummaryComment: "Reviewed and agreed.",
    });
    expect(reviewed.managerReview.status).toBe("reviewed");
  });
});

describe("idp.generateIdp local fallback", () => {
  it("should generate and retrieve an IDP without a date of joining", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.idp.generateIdp({
      employeeDetails: {
        employeeName: "Aisha Khan",
        position: "Operations Manager",
        company: "Emeritus",
        department: "Learning Operations",
        yearsOfExperience: 8,
        dateOfJoining: null,
        dateOfIdpCreation: new Date("2026-07-10"),
        directManager: "Rohit Kapoor",
      },
      uploadedFiles: [],
      manualInput:
        "Needs to strengthen strategic thinking, delegation, stakeholder communication, data-driven decision making, and coaching.",
      organizationLogo: "",
      language: "en",
    });

    expect(result.id).toBeGreaterThan(0);
    expect(result.objectives).toHaveLength(3);
    expect(result.objectives[0]).toHaveProperty("criticality");
    expect(result.objectives[0]).toHaveProperty("dimension");
    expect(result).toHaveProperty("leadershipSummary");
    expect(result).toHaveProperty("managerGuide");

    const idp = await caller.idp.getIdp({ id: result.id });
    expect(idp.employeeName).toBe("Aisha Khan");
    expect(idp.objectives).toHaveLength(3);
    expect(idp.summaryAdvice).toContain("leadership reflection plan");
  });
});
