import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dailyProgress = sqliteTable("daily_progress", {
  day: text("day").primaryKey(),
  payload: text("payload").notNull().default("{}"),
  stars: integer("stars").notNull().default(0),
  tomorrowLimit: integer("tomorrow_limit").notNull().default(100),
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
