import { db } from "./db";
import { 
  users, schools, students, fundraisers, studentFundraisers,
  type User, type InsertUser, type School, type InsertSchool,
  type Student, type InsertStudent, type Fundraiser, 
  type InsertFundraiser, type StudentFundraiser, type InsertStudentFundraiser,
  UserRole
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
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
    const [fundraiser] = await db.select().from(fundraisers).where(eq(fundraisers.id, id));
    return fundraiser;
  }

  async getFundraisersBySchoolId(schoolId: number): Promise<Fundraiser[]> {
    return db.select().from(fundraisers).where(eq(fundraisers.schoolId, schoolId));
  }

  async createFundraiser(fundraiser: InsertFundraiser): Promise<Fundraiser> {
    const [createdFundraiser] = await db.insert(fundraisers).values(fundraiser).returning();
    return createdFundraiser;
  }
}

export const storage = new DatabaseStorage();
