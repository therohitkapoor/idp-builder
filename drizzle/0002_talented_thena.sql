ALTER TABLE `idp_records` ADD `position` varchar(255);--> statement-breakpoint
ALTER TABLE `idp_records` ADD `strengths` json;--> statement-breakpoint
ALTER TABLE `idp_records` ADD `gaps` json;