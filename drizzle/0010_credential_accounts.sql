CREATE TABLE `credential_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `passwordHash` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `credential_accounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `credential_accounts_email_unique` UNIQUE(`email`)
);
