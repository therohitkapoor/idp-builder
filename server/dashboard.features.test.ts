import { describe, it, expect } from "vitest";

// Unit tests for dashboard v44 features:
// 1. IDP edit procedure input validation
// 2. CSV export logic (client-side, tested via data shape)
// 3. Status filter logic

// --- Status filter logic ---
type ObjectiveStatus = "not_started" | "in_progress" | "completed";

function getOverallStatus(objectives: { status: ObjectiveStatus }[]): "not_started" | "in_progress" | "completed" {
  if (!objectives || objectives.length === 0) return "not_started";
  const completed = objectives.filter((o) => o.status === "completed").length;
  const inProgress = objectives.filter((o) => o.status === "in_progress").length;
  if (completed === objectives.length) return "completed";
  if (inProgress > 0 || completed > 0) return "in_progress";
  return "not_started";
}

describe("getOverallStatus", () => {
  it("returns not_started when all objectives are not started", () => {
    const objectives = [
      { status: "not_started" as ObjectiveStatus },
      { status: "not_started" as ObjectiveStatus },
    ];
    expect(getOverallStatus(objectives)).toBe("not_started");
  });

  it("returns completed when all objectives are completed", () => {
    const objectives = [
      { status: "completed" as ObjectiveStatus },
      { status: "completed" as ObjectiveStatus },
    ];
    expect(getOverallStatus(objectives)).toBe("completed");
  });

  it("returns in_progress when some objectives are in progress", () => {
    const objectives = [
      { status: "not_started" as ObjectiveStatus },
      { status: "in_progress" as ObjectiveStatus },
    ];
    expect(getOverallStatus(objectives)).toBe("in_progress");
  });

  it("returns in_progress when some are completed and some not started", () => {
    const objectives = [
      { status: "completed" as ObjectiveStatus },
      { status: "not_started" as ObjectiveStatus },
    ];
    expect(getOverallStatus(objectives)).toBe("in_progress");
  });

  it("returns not_started for empty objectives array", () => {
    expect(getOverallStatus([])).toBe("not_started");
  });
});

// --- CSV export data shape ---
function buildCsvRows(idps: any[]) {
  return idps.map((idp) => {
    const objectives = (idp.objectives as any[]) || [];
    const total = objectives.length;
    const completed = objectives.filter((o: any) => o.status === "completed").length;
    const inProgress = objectives.filter((o: any) => o.status === "in_progress").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    let status = "Not Started";
    if (completed === total && total > 0) status = "Completed";
    else if (inProgress > 0 || completed > 0) status = "In Progress";
    return {
      id: idp.id,
      employeeName: idp.employeeName,
      objectivesCount: total,
      completedCount: completed,
      completionPct: `${pct}%`,
      overallStatus: status,
    };
  });
}

describe("buildCsvRows", () => {
  it("builds correct CSV row for a completed IDP", () => {
    const idps = [{
      id: 1,
      employeeName: "Ahmed",
      position: "Director",
      company: "Emeritus",
      department: "Academic",
      directManager: "CEO",
      objectives: [
        { status: "completed" },
        { status: "completed" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    const rows = buildCsvRows(idps);
    expect(rows[0].completionPct).toBe("100%");
    expect(rows[0].overallStatus).toBe("Completed");
    expect(rows[0].objectivesCount).toBe(2);
  });

  it("builds correct CSV row for a not-started IDP", () => {
    const idps = [{
      id: 2,
      employeeName: "Sara",
      position: "Manager",
      company: "Emeritus",
      department: "HR",
      directManager: "Director",
      objectives: [
        { status: "not_started" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    const rows = buildCsvRows(idps);
    expect(rows[0].completionPct).toBe("0%");
    expect(rows[0].overallStatus).toBe("Not Started");
  });

  it("builds correct CSV row for in-progress IDP", () => {
    const idps = [{
      id: 3,
      employeeName: "Omar",
      position: "Analyst",
      company: "Emeritus",
      department: "Finance",
      directManager: "CFO",
      objectives: [
        { status: "completed" },
        { status: "in_progress" },
        { status: "not_started" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    const rows = buildCsvRows(idps);
    expect(rows[0].completionPct).toBe("33%");
    expect(rows[0].overallStatus).toBe("In Progress");
  });

  it("handles IDP with no objectives", () => {
    const idps = [{
      id: 4,
      employeeName: "Layla",
      position: "Intern",
      company: "Emeritus",
      department: "IT",
      directManager: "CTO",
      objectives: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    const rows = buildCsvRows(idps);
    expect(rows[0].completionPct).toBe("0%");
    expect(rows[0].overallStatus).toBe("Not Started");
    expect(rows[0].objectivesCount).toBe(0);
  });
});

// --- Search filter logic ---
function applySearchFilter(idps: any[], query: string) {
  if (!query.trim()) return idps;
  const q = query.toLowerCase();
  return idps.filter((idp) =>
    (idp.employeeName || '').toLowerCase().includes(q) ||
    (idp.department || '').toLowerCase().includes(q) ||
    (idp.directManager || '').toLowerCase().includes(q) ||
    (idp.position || '').toLowerCase().includes(q) ||
    (idp.company || '').toLowerCase().includes(q)
  );
}

describe('applySearchFilter', () => {
  const idps = [
    { id: 1, employeeName: 'Ahmed Al-Rashid', department: 'Academic', directManager: 'CEO', position: 'Director', company: 'Emeritus' },
    { id: 2, employeeName: 'Sara Johnson', department: 'HR', directManager: 'Ahmed', position: 'Manager', company: 'Emeritus' },
    { id: 3, employeeName: 'Omar Khalid', department: 'Finance', directManager: 'CFO', position: 'Analyst', company: 'Emeritus' },
  ];

  it('returns all IDPs when query is empty', () => {
    expect(applySearchFilter(idps, '')).toHaveLength(3);
  });

  it('filters by employee name (case-insensitive)', () => {
    const result = applySearchFilter(idps, 'ahmed');
    expect(result).toHaveLength(2); // Ahmed Al-Rashid and Sara (manager is Ahmed)
  });

  it('filters by department', () => {
    const result = applySearchFilter(idps, 'finance');
    expect(result).toHaveLength(1);
    expect(result[0].employeeName).toBe('Omar Khalid');
  });

  it('filters by direct manager', () => {
    const result = applySearchFilter(idps, 'cfo');
    expect(result).toHaveLength(1);
    expect(result[0].employeeName).toBe('Omar Khalid');
  });

  it('filters by position', () => {
    const result = applySearchFilter(idps, 'manager');
    expect(result).toHaveLength(1);
    expect(result[0].employeeName).toBe('Sara Johnson');
  });

  it('returns empty array when no match', () => {
    const result = applySearchFilter(idps, 'xyz_no_match');
    expect(result).toHaveLength(0);
  });

  it('returns all when query is only whitespace', () => {
    expect(applySearchFilter(idps, '   ')).toHaveLength(3);
  });
});

// --- Edit IDP input validation ---
function validateEditInput(input: {
  employeeName: string;
  company: string;
  department: string;
  yearsOfExperience: number;
  directManager: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.employeeName || input.employeeName.trim().length === 0) errors.push("employeeName is required");
  if (!input.company || input.company.trim().length === 0) errors.push("company is required");
  if (!input.department || input.department.trim().length === 0) errors.push("department is required");
  if (input.yearsOfExperience < 0) errors.push("yearsOfExperience must be >= 0");
  if (!input.directManager || input.directManager.trim().length === 0) errors.push("directManager is required");
  return { valid: errors.length === 0, errors };
}

describe("validateEditInput", () => {
  it("passes valid input", () => {
    const result = validateEditInput({
      employeeName: "Ahmed",
      company: "Emeritus",
      department: "Academic",
      yearsOfExperience: 5,
      directManager: "CEO",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when employeeName is empty", () => {
    const result = validateEditInput({
      employeeName: "",
      company: "Emeritus",
      department: "Academic",
      yearsOfExperience: 5,
      directManager: "CEO",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("employeeName is required");
  });

  it("fails when yearsOfExperience is negative", () => {
    const result = validateEditInput({
      employeeName: "Ahmed",
      company: "Emeritus",
      department: "Academic",
      yearsOfExperience: -1,
      directManager: "CEO",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("yearsOfExperience must be >= 0");
  });

  it("fails when multiple required fields are empty", () => {
    const result = validateEditInput({
      employeeName: "",
      company: "",
      department: "Academic",
      yearsOfExperience: 0,
      directManager: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
