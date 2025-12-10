// Database schema for event management
// https://orm.drizzle.team/docs/sql-schema-declaration
// Force rebuild - updated schema to use "Another Read" prefix

import { pgTableCreator, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `Another Read_${name}`);

export const events = createTable("event", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords"), // Comma-separated keywords or JSON array
  description: text("description"), // Event description (max 200 words)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const books = createTable("book", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  isbn: text("isbn"),
  publicationDate: text("publication_date"),
  keywords: text("keywords"), // JSON array stored as text
  price: text("price"),
  genre: text("genre"),
  coverImageUrl: text("cover_image_url"),
  status: text("status"),
  externalId: text("external_id"), // Original ID from CSV
  createdBy: text("created_by"),
  isSample: text("is_sample"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventBooks = createTable("event_book", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  bookId: integer("book_id").notNull().references(() => books.id),
  matchScore: integer("match_score"), // Optional: store relevance score
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const content = createTable("content", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedBookIds: text("related_book_ids"), // JSON array of book IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = createTable("user", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed password
  userTier: text("user_tier").notNull().default("User"), // Admin, Marketer, or User
  status: text("status").notNull().default("Pending"), // Active, Closed, or Pending
  creditQuota: integer("credit_quota").notNull().default(0), // Total credits allocated to user
  creditsUsed: integer("credits_used").notNull().default(0), // Total credits consumed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = createTable("password_reset_token", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditUsage = createTable("credit_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  operation: text("operation").notNull(), // e.g., "daily_events", "content_generation"
  tokensUsed: integer("tokens_used").notNull(), // Total tokens consumed
  creditsDeducted: integer("credits_deducted").notNull(), // Credits deducted for this operation
  metadata: text("metadata"), // JSON string with additional details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const importLogs = createTable("import_log", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  totalBooks: integer("total_books").default(0),
  importedBooks: integer("imported_books").default(0),
  skippedBooks: integer("skipped_books").default(0),
  errorCount: integer("error_count").default(0),
  importSource: text("import_source"), // e.g., 'APONIX', 'Penguin'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const importErrors = createTable("import_error", {
  id: serial("id").primaryKey(),
  importLogId: integer("import_log_id").notNull().references(() => importLogs.id),
  bookIdentifier: text("book_identifier"), // ISBN or record reference
  errorType: text("error_type").notNull(), // e.g., 'parse_error', 'validation_error', 'database_error'
  errorMessage: text("error_message").notNull(),
  errorDetails: text("error_details"), // JSON string with stack trace or additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = createTable("api_key", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // The actual API key (hashed)
  name: text("name").notNull(), // Friendly name for the key
  userId: integer("user_id").references(() => users.id), // Optional: associate with a user
  status: text("status").notNull().default("active"), // 'active' or 'revoked'
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
