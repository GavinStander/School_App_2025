import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles enum
export const UserRole = {
  ADMIN: "admin",
  SCHOOL: "school",
  STUDENT: "student",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<UserRoleType>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adminName: text("admin_name").notNull(),
  address: text("address"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fundraisers table
export const fundraisers = pgTable("fundraisers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  goal: integer("goal").notNull(),
  currentAmount: integer("current_amount").default(0).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student-Fundraiser relationships
export const studentFundraisers = pgTable("student_fundraisers", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  fundraiserId: integer("fundraiser_id").references(() => fundraisers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.id],
    references: [schools.userId],
  }),
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
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

// Zod schemas for insertion
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

// Extended schemas for registration
export const schoolRegisterSchema = insertUserSchema.extend({
  name: z.string().min(2, "School name is required"),
  adminName: z.string().min(2, "Admin name is required"),
  address: z.string().optional(),
});

export const studentRegisterSchema = insertUserSchema.extend({
  schoolId: z.number().min(1, "Please select a school"),
});

// Type definitions
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
