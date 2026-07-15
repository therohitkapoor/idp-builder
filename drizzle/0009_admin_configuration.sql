CREATE TABLE `admin_configurations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(128) NOT NULL DEFAULT 'default',
  `settings` json NOT NULL,
  `updatedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `admin_configurations_id` PRIMARY KEY(`id`)
);
