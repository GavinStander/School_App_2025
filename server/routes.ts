import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { UserRole } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check user role
  const hasRole = (role: string) => (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Get current user with extended info
  app.get("/api/user/info", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      let extendedInfo: any = { ...user };

      if (user.role === UserRole.SCHOOL) {
        const school = await storage.getSchoolByUserId(user.id);
        if (school) {
          const schoolWithCount = await storage.getSchoolWithStudentCount(school.id);
          extendedInfo.school = schoolWithCount;
        }
      } else if (user.role === UserRole.STUDENT) {
        const student = await storage.getStudentByUserId(user.id);
        if (student) {
          const school = await storage.getSchool(student.schoolId);
          extendedInfo.student = { ...student, school };
        }
      }

      res.json(extendedInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

  // Admin routes
  app.get("/api/admin/schools", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const schools = await storage.getAllSchoolsWithStudentCount();
      res.json(schools);
    } catch (error) {
      res.status(500).json({ message: "Failed to get schools" });
    }
  });

  app.get("/api/admin/students", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const students = await storage.getAllStudentsWithUserInfo();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to get students" });
    }
  });

  // School routes
  app.get("/api/school/students", isAuthenticated, hasRole(UserRole.SCHOOL), async (req, res) => {
    try {
      const school = await storage.getSchoolByUserId(req.user.id);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const students = await storage.getStudentsWithUserInfoBySchoolId(school.id);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to get students" });
    }
  });

  // Update school information
  app.put("/api/school/update", isAuthenticated, hasRole(UserRole.SCHOOL), async (req, res) => {
    try {
      const school = await storage.getSchoolByUserId(req.user.id);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Extract only allowed fields to update
      const { name, address, adminName } = req.body;
      const updatedSchool = await storage.updateSchool(school.id, { 
        name, 
        address, 
        adminName
      });

      res.json(updatedSchool);
    } catch (error) {
      res.status(500).json({ message: "Failed to update school information" });
    }
  });

  // Student routes
  app.get("/api/student/school", isAuthenticated, hasRole(UserRole.STUDENT), async (req, res) => {
    try {
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const school = await storage.getSchool(student.schoolId);
      res.json(school);
    } catch (error) {
      res.status(500).json({ message: "Failed to get school info" });
    }
  });

  // Common routes for all authenticated users
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const totalSchools = (await storage.getAllSchools()).length;
      const totalStudents = (await storage.getAllStudents()).length;
      
      res.json({
        totalSchools,
        totalStudents
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
