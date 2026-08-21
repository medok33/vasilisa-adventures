CREATE TABLE `daily_progress` (
	`day` text PRIMARY KEY NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`tomorrow_limit` integer DEFAULT 100 NOT NULL,
	`closed` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
