CREATE TABLE `idp_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeName` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`department` varchar(255) NOT NULL,
	`yearsOfExperience` int NOT NULL,
	`dateOfJoining` timestamp NOT NULL,
	`dateOfIdpCreation` timestamp NOT NULL,
	`directManager` varchar(255) NOT NULL,
	`uploadedFiles` json,
	`manualInput` text,
	`objectives` json,
	`summaryAdvice` text,
	`status` enum('draft','processing','completed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `idp_records_id` PRIMARY KEY(`id`)
);
