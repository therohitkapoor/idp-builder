import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";
import type {
  DevelopmentFramework,
  EnterpriseContextInputs,
  ExtractedInsight,
  IdpMode,
  ManagerReview,
  OrganizationConfig,
  PriorityCheckIn,
  SupportingSourceType,
  UploadedSourceFile,
} from "../shared/idpEnterprise";
import type { AdminConfiguration } from "../shared/adminConfig";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  organizationId: varchar("organizationId", { length: 128 }),
  organizationName: varchar("organizationName", { length: 255 }),
  participantId: varchar("participantId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * IDP records table for storing generated Individual Development Plans
 */
export const idpRecords = mysqlTable("idp_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Employee details
  employeeName: varchar("employeeName", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }),
  company: varchar("company", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  yearsOfExperience: int("yearsOfExperience").notNull(),
  dateOfJoining: timestamp("dateOfJoining").notNull(),
  dateOfIdpCreation: timestamp("dateOfIdpCreation").notNull(),
  directManager: varchar("directManager", { length: 255 }).notNull(),
  
  // Input data
  uploadedFiles: json("uploadedFiles").$type<Array<{ name: string; url?: string; key: string }>>(),
  manualInput: text("manualInput"),
  organizationLogo: text("organizationLogo"),  // URL to organization logo

  // Enterprise IDP workflow metadata
  idpMode: varchar("idpMode", { length: 64 }).$type<IdpMode>().default("program_based"),
  supportingSources: json("supportingSources").$type<SupportingSourceType[]>(),
  sourceFiles: json("sourceFiles").$type<UploadedSourceFile[]>(),
  contextInputs: json("contextInputs").$type<EnterpriseContextInputs>(),
  extractedInsights: json("extractedInsights").$type<ExtractedInsight[]>(),
  confirmedInsights: json("confirmedInsights").$type<ExtractedInsight[]>(),
  developmentFramework: varchar("developmentFramework", { length: 64 })
    .$type<DevelopmentFramework>()
    .default("experience_people_learning"),
  organizationConfig: json("organizationConfig").$type<OrganizationConfig>(),
  aspiration: text("aspiration"),
  reviewPeriod: varchar("reviewPeriod", { length: 255 }),
  
  // Generated IDP content
  objectives: json("objectives").$type<Array<{
    title: string;
    description: string;
    measurable: string;
      criticality: "low" | "medium" | "high" | "critical";  // Gap criticality level
    status: "not_started" | "in_progress" | "blocked" | "completed" | "revised";
    progress: number;
    deadline?: string;  // ISO date string
    latestReflection?: string;
    evidenceUploaded?: Array<{ name: string; key?: string; url?: string; uploadedAt?: string }>;
    managerFeedback?: string;
    reviewDate?: string;
    nextAction?: string;
    checkIns?: PriorityCheckIn[];
    sourceEvidence?: Array<{
      sourceType: SupportingSourceType;
      sourceReference: string;
      confidence: "low" | "medium" | "high";
      userConfirmed: boolean;
      aiInferred: boolean;
    }>;
    recommendations: {
      experiential: string[];  // 70%
      social: string[];        // 20%
      formal: string[];        // 10%
    };
  }>>(),
  summaryAdvice: text("summaryAdvice"),
  
  // Analysis data for charts
  strengths: json("strengths").$type<Array<{ area: string; score: number }>>(),
  gaps: json("gaps").$type<Array<{ area: string; score: number }>>(),
  
  // GROW Model coaching framework
  growModel: json("growModel").$type<{
    goal: string;
    reality: string;
    options: string[];
    willDo: string[];
  }>(),
  
  // Learning resources
  learningResources: json("learningResources").$type<Array<{
    objectiveIndex: number;
    title: string;
    provider: string;
    type: string;
    url: string;
    duration: string;
  }>>(),

  // Enterprise report sections generated from structured context
  leadershipSummary: json("leadershipSummary").$type<Record<string, unknown>>(),
  commitments: json("commitments").$type<Record<string, unknown>>(),
  actionPlan: json("actionPlan").$type<Record<string, unknown>>(),
  managerGuide: json("managerGuide").$type<Record<string, unknown>>(),
  enterpriseMetadata: json("enterpriseMetadata").$type<Record<string, unknown>>(),
  managerReview: json("managerReview").$type<ManagerReview>(),
  checkIns: json("checkIns").$type<PriorityCheckIn[]>(),
  
  // Signatures
  employeeSignature: text("employeeSignature"),  // Base64 encoded signature image
  employeeSignedAt: timestamp("employeeSignedAt"),
  managerSignature: text("managerSignature"),  // Base64 encoded signature image
  managerSignedAt: timestamp("managerSignedAt"),
  
  // Status
  status: mysqlEnum("status", ["draft", "processing", "completed", "in_review", "finalized", "archived"]).default("draft").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IdpRecord = typeof idpRecords.$inferSelect;
export type InsertIdpRecord = typeof idpRecords.$inferInsert;

/**
 * Role change audit log for tracking admin role promotions/demotions
 */
export const roleAuditLog = mysqlTable("role_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),       // Admin who made the change
  actorName: varchar("actorName", { length: 255 }),
  targetUserId: int("targetUserId").notNull(), // User whose role changed
  targetUserName: varchar("targetUserName", { length: 255 }),
  oldRole: mysqlEnum("oldRole", ["user", "admin"]).notNull(),
  newRole: mysqlEnum("newRole", ["user", "admin"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoleAuditLog = typeof roleAuditLog.$inferSelect;
export type InsertRoleAuditLog = typeof roleAuditLog.$inferInsert;

/**
 * Local credential login accounts. The main users table still owns identity and
 * role; this table stores only credential-specific lookup and password hash.
 */
export const credentialAccounts = mysqlTable("credential_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredentialAccount = typeof credentialAccounts.$inferSelect;
export type InsertCredentialAccount = typeof credentialAccounts.$inferInsert;

/**
 * Enterprise admin configuration for organization setup, participant roster,
 * program context, IDP workflow settings, and document controls.
 */
export const adminConfigurations = mysqlTable("admin_configurations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).default("default").notNull(),
  settings: json("settings").$type<AdminConfiguration>().notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminConfigurationRecord = typeof adminConfigurations.$inferSelect;
export type InsertAdminConfigurationRecord = typeof adminConfigurations.$inferInsert;
