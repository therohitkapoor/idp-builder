ALTER TABLE `idp_records`
  ADD `idpMode` varchar(64) DEFAULT 'program_based',
  ADD `supportingSources` json,
  ADD `sourceFiles` json,
  ADD `contextInputs` json,
  ADD `extractedInsights` json,
  ADD `confirmedInsights` json,
  ADD `developmentFramework` varchar(64) DEFAULT 'experience_people_learning',
  ADD `organizationConfig` json,
  ADD `aspiration` text,
  ADD `reviewPeriod` varchar(255),
  ADD `leadershipSummary` json,
  ADD `commitments` json,
  ADD `actionPlan` json,
  ADD `managerGuide` json,
  ADD `enterpriseMetadata` json,
  ADD `managerReview` json,
  ADD `checkIns` json;

ALTER TABLE `idp_records`
  MODIFY `status` enum('draft','processing','completed','in_review','finalized','archived') NOT NULL DEFAULT 'draft';
