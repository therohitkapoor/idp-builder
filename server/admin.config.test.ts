import { describe, expect, it } from "vitest";
import {
  createDefaultAdminConfiguration,
  normalizeAdminConfiguration,
  type AdminConfiguration,
} from "../shared/adminConfig";

describe("enterprise admin configuration", () => {
  it("creates defaults for the selected admin setup scope", () => {
    const config = createDefaultAdminConfiguration();

    expect(config.organization.organizationName).toBeTruthy();
    expect(config.organizations).toHaveLength(1);
    expect(config.selectedOrganizationId).toBe(config.organization.id);
    expect(config.idp.allowedApproaches).toEqual(["assessment_based", "program_based", "role_based"]);
    expect(config.idp.defaultPriorityCount).toBe(3);
    expect(config.idp.managerReviewRequired).toBe(true);
    expect(config.evidence.secureDeletionEnabled).toBe(true);
    expect(config.evidence.allowedFileTypes).toContain(".pdf");
    expect(config.evidence.allowedFileTypes).toContain(".pptx");
    expect(config.evidence.assessmentProviders).toContain("Hogan");
    expect(config.companyKnowledge.documents).toEqual([]);
    expect(config.companyKnowledge.useApprovedDocumentsOnly).toBe(true);
    expect(config.companyKnowledge.requireSourceReferences).toBe(true);
    expect(config.companyKnowledge.flagEvidenceConflicts).toBe(true);
    expect(config.report.maxPriorityCount).toBe(3);
    expect(config.report.enabledSections.managerGuide).toBe(true);
    expect(config.report.showObjectivesNavigator).toBe(true);
    expect(config.report.sectionOrder.slice(0, 4)).toEqual([
      "purposeGuidance",
      "employeeInformation",
      "executiveSummary",
      "strengthsAndGaps",
    ]);
    expect(config.revisions.allowManagerSuggestedEdits).toBe(true);
  });

  it("keeps fixed report sections locked at the top when normalizing report order", () => {
    const config = createDefaultAdminConfiguration() as AdminConfiguration;
    config.report.sectionOrder = [
      "learningRecommendations",
      "employeeInformation",
      "signatures",
      "purposeGuidance",
      "executiveSummary",
      "strengthsAndGaps",
    ];
    config.report.enabledSections.purposeGuidance = false;
    config.report.enabledSections.employeeInformation = false;

    const normalized = normalizeAdminConfiguration(config);

    expect(normalized.report.sectionOrder.slice(0, 4)).toEqual([
      "purposeGuidance",
      "employeeInformation",
      "executiveSummary",
      "strengthsAndGaps",
    ]);
    expect(normalized.report.sectionOrder.slice(4, 6)).toEqual(["learningRecommendations", "signatures"]);
    expect(normalized.report.enabledSections.purposeGuidance).toBe(true);
    expect(normalized.report.enabledSections.employeeInformation).toBe(true);
  });

  it("stores participants explicitly under their organization", () => {
    const config = createDefaultAdminConfiguration() as AdminConfiguration;
    const secondOrganization = {
      ...config.organization,
      id: "org-apac",
      organizationName: "APAC Leadership Academy",
      region: "APAC",
    };
    config.organizations = [config.organization, secondOrganization];
    config.selectedOrganizationId = secondOrganization.id;
    config.organization = secondOrganization;
    config.participants = [
      {
        id: "participant-1",
        organizationId: secondOrganization.id,
        name: "Asha Rao",
        email: "asha@example.com",
        role: "Regional Manager",
        department: "Operations",
        managerName: "Dev Mehta",
        status: "active",
        addedAt: "2026-07-14T00:00:00.000Z",
      },
    ];

    const normalized = normalizeAdminConfiguration(config);

    expect(normalized.organizations).toHaveLength(2);
    expect(normalized.organization.organizationName).toBe("APAC Leadership Academy");
    expect(normalized.participants[0].organizationId).toBe("org-apac");
  });

  it("normalizes unsafe or unsupported admin choices", () => {
    const config = createDefaultAdminConfiguration() as AdminConfiguration;
    config.idp.allowedApproaches = ["assessment_based", "comprehensive" as never];
    config.idp.leadershipAreas.leadingSelf = false;
    config.idp.defaultPriorityCount = 12;
    config.evidence.maxFileSizeMb = 500;
    config.evidence.allowedFileTypes = [".PDF", ".pdf", "exe", ".docx"];
    config.evidence.assessmentProviders = ["Hogan", " Hogan ", "", "SHL"];

    const normalized = normalizeAdminConfiguration(config);

    expect(normalized.idp.allowedApproaches).toEqual(["assessment_based"]);
    expect(normalized.idp.leadershipAreas.leadingSelf).toBe(true);
    expect(normalized.idp.defaultPriorityCount).toBe(5);
    expect(normalized.evidence.maxFileSizeMb).toBe(100);
    expect(normalized.evidence.allowedFileTypes).toEqual([".pdf", ".docx"]);
    expect(normalized.evidence.assessmentProviders).toEqual(["Hogan", "SHL"]);
  });

  it("normalizes program documents and dynamic report logic", () => {
    const config = createDefaultAdminConfiguration() as AdminConfiguration;
    config.program.documents = [
      {
        id: "",
        name: "Advanced Leadership Brochure.pdf",
        mimeType: "application/pdf",
        size: 2048,
        uploadedAt: "",
        status: "pending_review",
        documentType: "program_brochure",
        reviewStatus: "verified",
        extractedSummary: "Objectives: Build strategic leadership.",
        extractedFields: {
          programName: "Advanced Leadership Program",
          objectives: "Build strategic leadership.",
        },
      },
    ];
    config.evidence.developmentFramework = "grow";
    config.report.maxPriorityCount = 4;
    config.report.enabledSections.learningRecommendations = false;
    config.revisions.revisionCadence = "monthly";
    config.revisions.editableSections = ["developmentPriorities", "not-supported"];

    const normalized = normalizeAdminConfiguration(config);

    expect(normalized.program.documents[0].id).toBeTruthy();
    expect(normalized.program.documents[0].reviewStatus).toBe("verified");
    expect(normalized.evidence.developmentFramework).toBe("grow");
    expect(normalized.report.maxPriorityCount).toBe(4);
    expect(normalized.report.enabledSections.learningRecommendations).toBe(false);
    expect(normalized.revisions.revisionCadence).toBe("monthly");
    expect(normalized.revisions.editableSections).toEqual(["developmentPriorities"]);
  });

  it("normalizes and isolates company knowledge documents by organization", () => {
    const config = createDefaultAdminConfiguration() as AdminConfiguration;
    config.companyKnowledge.documents = [
      {
        id: "company-doc-1",
        name: "Hitachi Leadership Framework.pdf",
        url: "https://example.com/hitachi-leadership.pdf",
        key: "company/hitachi-leadership.pdf",
        hash: "hash-1",
        mimeType: "application/pdf",
        size: 4096,
        uploadedAt: "2026-07-15T00:00:00.000Z",
        status: "ready",
        organizationId: config.organization.id,
        category: "leadership_competency_framework",
        sourceType: "organization_leadership_framework",
        sourceClassification: "internal_official",
        reviewStatus: "approved",
        confidentiality: "internal",
        businessUnit: "Group HR",
        geography: "Global",
        roleFamily: "Leadership",
        leadershipLevel: "Senior Manager / Director",
        effectiveDate: "2026-04-01",
        expiryDate: "2027-03-31",
        owner: "Hitachi Academy",
        version: " 2.0 ",
        extractedSummary: "Grow, Think, Execute, Inspire.",
        adminNotes: "Approved for the Key Talent programme.",
      },
      {
        id: "company-doc-2",
        name: "Unassigned Strategy.pdf",
        mimeType: "application/pdf",
        size: 1024,
        uploadedAt: "",
        status: "pending_review",
        organizationId: "unknown-organization",
        category: "strategy_business_priorities",
        sourceType: "strategic_priorities",
        sourceClassification: "official_public",
        reviewStatus: "needs_review",
        confidentiality: "public",
        businessUnit: "",
        geography: "",
        roleFamily: "",
        leadershipLevel: "",
        effectiveDate: "",
        expiryDate: "",
        owner: "",
        version: "",
        extractedSummary: "",
        adminNotes: "",
      },
    ];

    const normalized = normalizeAdminConfiguration(config);

    expect(normalized.companyKnowledge.documents).toHaveLength(2);
    expect(normalized.companyKnowledge.documents[0]).toMatchObject({
      organizationId: config.organization.id,
      reviewStatus: "approved",
      sourceType: "organization_leadership_framework",
      version: "2.0",
    });
    expect(normalized.companyKnowledge.documents[1].organizationId).toBe(config.organization.id);
    expect(normalized.companyKnowledge.documents[1].version).toBe("1.0");
  });
});
