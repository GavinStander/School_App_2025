import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// -----------------------------
// Enums
// -----------------------------
export const UserRole = {
  ADMIN: "admin",
  SCHOOL: "school",
  STUDENT: "student",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// -----------------------------
// Tables
// -----------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<UserRoleType>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adminName: text("admin_name").notNull(),
  address: text("address"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fundraisers = pgTable("fundraisers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Using 'name' column in the database
  location: text("location").notNull(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  eventDate: text("event_date").notNull(), // Use string format 'YYYY-MM-DD'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentFundraisers = pgTable("student_fundraisers", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  fundraiserId: integer("fundraiser_id").references(() => fundraisers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, success, warning, error
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketPurchases = pgTable("ticket_purchases", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiser_id").notNull(),
  studentId: integer("student_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  quantity: integer("quantity").notNull().default(1),
  amount: integer("amount").notNull(), // stored in cents
  paymentIntentId: text("payment_intent_id").notNull(),
  paymentStatus: text("payment_status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------
// Relations
// -----------------------------
export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.id],
    references: [schools.userId],
  }),
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  notifications: many(notifications),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  user: one(users, {
    fields: [schools.userId],
    references: [users.id],
  }),
  students: many(students),
  fundraisers: many(fundraisers),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  studentFundraisers: many(studentFundraisers),
}));

export const fundraisersRelations = relations(fundraisers, ({ one, many }) => ({
  school: one(schools, {
    fields: [fundraisers.schoolId],
    references: [schools.id],
  }),
  studentFundraisers: many(studentFundraisers),
}));

export const studentFundraisersRelations = relations(studentFundraisers, ({ one }) => ({
  student: one(students, {
    fields: [studentFundraisers.studentId],
    references: [students.id],
  }),
  fundraiser: one(fundraisers, {
    fields: [studentFundraisers.fundraiserId],
    references: [fundraisers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const ticketPurchasesRelations = relations(ticketPurchases, ({ one }) => ({
  fundraiser: one(fundraisers, {
    fields: [ticketPurchases.fundraiserId],
    references: [fundraisers.id],
  }),
  student: one(students, {
    fields: [ticketPurchases.studentId],
    references: [students.id],
  }),
}));

// -----------------------------
// Zod Insert Schemas
// -----------------------------
export const insertUserSchema = createInsertSchema(users, {
  role: z.enum([UserRole.ADMIN, UserRole.SCHOOL, UserRole.STUDENT]),
}).omit({
  id: true,
  createdAt: true,
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertFundraiserSchema = createInsertSchema(fundraisers).omit({
  id: true,
  createdAt: true,
});

export const insertStudentFundraiserSchema = createInsertSchema(studentFundraisers).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTicketPurchaseSchema = createInsertSchema(ticketPurchases).omit({
  id: true,
  createdAt: true,
});

// -----------------------------
// Extended Registration Schemas
// -----------------------------
export const schoolRegisterSchema = insertUserSchema.extend({
  name: z.string().min(2, "School name is required"),
  adminName: z.string().min(2, "Admin name is required"),
  address: z.string().optional(),
});

export const studentRegisterSchema = insertUserSchema.extend({
  schoolId: z.number().min(1, "Please select a school"),
});

// -----------------------------
// Type Definitions
// -----------------------------
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Fundraiser = typeof fundraisers.$inferSelect;
export type InsertFundraiser = z.infer<typeof insertFundraiserSchema>;

export type StudentFundraiser = typeof studentFundraisers.$inferSelect;
export type InsertStudentFundraiser = z.infer<typeof insertStudentFundraiserSchema>;

export type SchoolRegister = z.infer<typeof schoolRegisterSchema>;
export type StudentRegister = z.infer<typeof studentRegisterSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type TicketPurchase = typeof ticketPurchases.$inferSelect;
export type InsertTicketPurchase = z.infer<typeof insertTicketPurchaseSchema>;
