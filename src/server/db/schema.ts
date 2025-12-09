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
