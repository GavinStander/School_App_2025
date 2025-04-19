import { db } from "./db";
import { 
  users, schools, students, fundraisers, studentFundraisers, notifications, ticketPurchases,
  type User, type InsertUser, type School, type InsertSchool,
  type Student, type InsertStudent, type Fundraiser, 
  type InsertFundraiser, type StudentFundraiser, type InsertStudentFundraiser,
  type Notification, type InsertNotification, type TicketPurchase, type InsertTicketPurchase,
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
  
  // Ticket purchase operations
  createTicketPurchase(ticketPurchase: InsertTicketPurchase): Promise<TicketPurchase>;
  getTicketPurchasesByFundraiserId(fundraiserId: number): Promise<TicketPurchase[]>;
  getTicketPurchasesByStudentId(studentId: number): Promise<TicketPurchase[]>;
  getTicketSalesSummaryByStudent(studentId: number): Promise<{ totalAmount: number; totalTickets: number }>;
  
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
      // Use SQL query directly to avoid issues with column names
      const result = await db.execute(
        sql`SELECT id, name, location, school_id as "schoolId", is_active as "isActive", 
             event_date as "eventDate", created_at as "createdAt" 
             FROM fundraisers 
             WHERE id = ${id}`
      );
      
      if (result && result.length > 0) {
        return result[0] as Fundraiser;
      }
      return undefined;
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

  // Ticket purchase operations
  async createTicketPurchase(ticketPurchase: InsertTicketPurchase): Promise<TicketPurchase> {
    try {
      console.log("Creating ticket purchase with SQL:", ticketPurchase);
      
      // Use SQL query directly to avoid schema mismatch issues
      const result = await db.execute(
        sql`INSERT INTO ticket_purchases (
          fundraiser_id, student_id, customer_name, customer_email, 
          quantity, amount, payment_intent_id, payment_status, payment_method
        ) VALUES (
          ${ticketPurchase.fundraiserId}, 
          ${ticketPurchase.studentId}, 
          ${ticketPurchase.customerName}, 
          ${ticketPurchase.customerEmail},
          ${ticketPurchase.quantity}, 
          ${ticketPurchase.amount}, 
          ${ticketPurchase.paymentIntentId}, 
          ${ticketPurchase.paymentStatus},
          'paystack'
        ) RETURNING 
          id, fundraiser_id as "fundraiserId", student_id as "studentId",
          customer_name as "customerName", customer_email as "customerEmail",
          quantity, amount, payment_intent_id as "paymentIntentId",
          payment_status as "paymentStatus", payment_method as "paymentMethod",
          created_at as "createdAt"
      `);
      
      if (result && result.length > 0) {
        console.log("Created ticket purchase:", result[0]);
        return result[0] as TicketPurchase;
      }
      
      throw new Error("Failed to create ticket purchase");
    } catch (error) {
      console.error("Error creating ticket purchase:", error);
      throw error;
    }
  }

  async getTicketPurchasesByFundraiserId(fundraiserId: number): Promise<TicketPurchase[]> {
    try {
      // Use raw SQL query to avoid schema mismatch issues
      const result = await db.execute(
        sql`SELECT 
            id, fundraiser_id as "fundraiserId", student_id as "studentId", 
            customer_name as "customerName", customer_email as "customerEmail",
            customer_phone as "customerPhone", quantity, amount, 
            payment_intent_id as "paymentIntentId", 
            payment_status as "paymentStatus", payment_method as "paymentMethod",
            student_email as "studentEmail", ticket_info as "ticketInfo",
            created_at as "createdAt"
          FROM ticket_purchases 
          WHERE fundraiser_id = ${fundraiserId}
          ORDER BY created_at DESC`
      );
      
      return result as TicketPurchase[];
    } catch (error) {
      console.error("Error getting ticket purchases by fundraiser ID:", error);
      return [];
    }
  }

  async getTicketPurchasesByStudentId(studentId: number): Promise<TicketPurchase[]> {
    try {
      // Use raw SQL query to avoid schema mismatch issues
      const result = await db.execute(
        sql`SELECT 
            id, fundraiser_id as "fundraiserId", student_id as "studentId", 
            customer_name as "customerName", customer_email as "customerEmail",
            customer_phone as "customerPhone", quantity, amount, 
            payment_intent_id as "paymentIntentId", 
            payment_status as "paymentStatus", payment_method as "paymentMethod",
            student_email as "studentEmail", ticket_info as "ticketInfo",
            created_at as "createdAt"
          FROM ticket_purchases 
          WHERE student_id = ${studentId}
          ORDER BY created_at DESC`
      );
      
      return result as TicketPurchase[];
    } catch (error) {
      console.error("Error getting ticket purchases by student ID:", error);
      return [];
    }
  }

  async getTicketSalesSummaryByStudent(studentId: number): Promise<{ totalAmount: number; totalTickets: number }> {
    try {
      // Using SQL directly for aggregate functions
      const result = await db.execute(
        sql`SELECT 
            SUM(amount) as "totalAmount", 
            SUM(quantity) as "totalTickets" 
          FROM ticket_purchases 
          WHERE student_id = ${studentId} 
            AND payment_status = 'completed'`
      );
      
      const summary = result[0] as { totalAmount: string; totalTickets: string };
      
      return {
        totalAmount: parseInt(summary.totalAmount || '0', 10) / 100, // Convert back from cents to dollars
        totalTickets: parseInt(summary.totalTickets || '0', 10)
      };
    } catch (error) {
      console.error("Error getting ticket sales summary:", error);
      return { totalAmount: 0, totalTickets: 0 };
    }
  }
}

export const storage = new DatabaseStorage();
