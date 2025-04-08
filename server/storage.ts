import { db } from "./db";
import { 
  users, schools, students, fundraisers, studentFundraisers, notifications,
  type User, type InsertUser, type School, type InsertSchool,
  type Student, type InsertStudent, type Fundraiser, 
  type InsertFundraiser, type StudentFundraiser, type InsertStudentFundraiser,
  type Notification, type InsertNotification,
  UserRole
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // School operations
  getSchool(id: number): Promise<School | undefined>;
  getSchoolByUserId(userId: number): Promise<School | undefined>;
  getAllSchools(): Promise<School[]>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<InsertSchool>): Promise<School>;
  getSchoolWithStudentCount(schoolId: number): Promise<{school: School, studentCount: number} | undefined>;
  getAllSchoolsWithStudentCount(): Promise<{school: School, studentCount: number}[]>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  getAllStudents(): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  getStudentsWithUserInfoBySchoolId(schoolId: number): Promise<any[]>;
  getAllStudentsWithUserInfo(): Promise<any[]>;

  // Fundraiser operations
  getFundraiser(id: number): Promise<Fundraiser | undefined>;
  getFundraisersBySchoolId(schoolId: number): Promise<Fundraiser[]>;
  createFundraiser(fundraiser: InsertFundraiser): Promise<Fundraiser>;
  
  // Notification operations
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Get the database URL, prioritizing NEON_DATABASE_URL if available
    const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    
    // Use PostgreSQL session store for persistent sessions
    this.sessionStore = new PgStore({
      conString: databaseUrl,
      createTableIfMissing: true,
      tableName: 'session'
    });
    console.log(`Using PostgreSQL session store with ${process.env.NEON_DATABASE_URL ? 'NEON_DATABASE_URL' : 'DATABASE_URL'}`);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  // School operations
  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async getSchoolByUserId(userId: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.userId, userId));
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return db.select().from(schools).orderBy(desc(schools.createdAt));
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [createdSchool] = await db.insert(schools).values(school).returning();
    return createdSchool;
  }

  async updateSchool(id: number, data: Partial<InsertSchool>): Promise<School> {
    const [updatedSchool] = await db
      .update(schools)
      .set(data)
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async getSchoolWithStudentCount(schoolId: number): Promise<{ school: School, studentCount: number } | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

    const schoolStudents = await db.select().from(students).where(eq(students.schoolId, schoolId));
    return {
      school,
      studentCount: schoolStudents.length
    };
  }

  async getAllSchoolsWithStudentCount(): Promise<{ school: School, studentCount: number }[]> {
    const allSchools = await this.getAllSchools();
    const result = [];

    for (const school of allSchools) {
      const schoolStudents = await db.select().from(students).where(eq(students.schoolId, school.id));
      result.push({
        school,
        studentCount: schoolStudents.length
      });
    }

    return result;
  }

  // Student operations
  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student;
  }

  async getAllStudents(): Promise<Student[]> {
    return db.select().from(students).orderBy(desc(students.createdAt));
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [createdStudent] = await db.insert(students).values(student).returning();
    return createdStudent;
  }

  async getStudentsWithUserInfoBySchoolId(schoolId: number): Promise<any[]> {
    const studentsData = await db.select().from(students).where(eq(students.schoolId, schoolId));
    const result = [];

    for (const student of studentsData) {
      const user = await this.getUser(student.userId);
      if (user) {
        result.push({
          ...student,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt
          }
        });
      }
    }

    return result;
  }

  async getAllStudentsWithUserInfo(): Promise<any[]> {
    const studentsData = await this.getAllStudents();
    const result = [];

    for (const student of studentsData) {
      const user = await this.getUser(student.userId);
      const school = await this.getSchool(student.schoolId);
      
      if (user && school) {
        result.push({
          ...student,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt
          },
          school: {
            id: school.id,
            name: school.name
          }
        });
      }
    }

    return result;
  }

  // Fundraiser operations
  async getFundraiser(id: number): Promise<Fundraiser | undefined> {
    try {
      const [fundraiser] = await db.select().from(fundraisers).where(eq(fundraisers.id, id));
      return fundraiser;
    } catch (error) {
      console.error("Error getting fundraiser:", error);
      return undefined;
    }
  }

  async getFundraisersBySchoolId(schoolId: number): Promise<Fundraiser[]> {
    try {
      console.log("Fetching fundraisers for school ID:", schoolId);
      // Use SQL query directly to avoid issues with column names
      const result = await db.execute(
        sql`SELECT id, name, location, school_id as "schoolId", is_active as "isActive", 
             event_date as "eventDate", created_at as "createdAt" 
             FROM fundraisers 
             WHERE school_id = ${schoolId} 
             ORDER BY event_date DESC`
      );
      console.log("Fundraisers result:", result);
      return result as Fundraiser[];
    } catch (error) {
      console.error("Error getting fundraisers by school ID:", error);
      return [];
    }
  }

  async createFundraiser(fundraiser: InsertFundraiser): Promise<Fundraiser> {
    try {
      console.log("Creating fundraiser with direct SQL:", fundraiser);
      // Use a raw SQL query to insert the data, avoiding Drizzle mapping issues
      const result = await db.execute(
        sql`INSERT INTO fundraisers (name, location, school_id, is_active, event_date) 
            VALUES (${fundraiser.name}, ${fundraiser.location}, ${fundraiser.schoolId}, 
                   ${fundraiser.isActive ?? true}, ${fundraiser.eventDate})
            RETURNING id, name, location, school_id as "schoolId", is_active as "isActive", 
                     event_date as "eventDate", created_at as "createdAt"`
      );
      console.log("Create fundraiser result:", result);
      // Return the first row
      return result[0] as Fundraiser;
    } catch (error) {
      console.error("Error creating fundraiser:", error);
      throw error;
    }
  }

  // Notification operations
  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    try {
      return db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  async getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    try {
      console.log('Fetching unread notifications for user ID:', userId);
      
      const unreadNotifications = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ))
        .orderBy(desc(notifications.createdAt));
        
      console.log('Unread notifications found:', unreadNotifications);
      return unreadNotifications;
    } catch (error) {
      console.error("Error getting unread notifications:", error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [createdNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return createdNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
