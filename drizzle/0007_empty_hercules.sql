CREATE TABLE `role_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(255),
	`targetUserId` int NOT NULL,
	`targetUserName` varchar(255),
	`oldRole` enum('user','admin') NOT NULL,
	`newRole` enum('user','admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_audit_log_id` PRIMARY KEY(`id`)
);
