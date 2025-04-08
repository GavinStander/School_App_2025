import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, UserRole, SchoolRegister, StudentRegister } from "@shared/schema";
import { db } from "./db";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password contains a salt (has a dot separator)
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // For testing/development purpose only - direct comparison
    // This is not secure and should be removed in production
    console.log("Warning: Using direct password comparison - not secure for production!");
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "schoolraise-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register route for all user types
  app.post("/api/register", async (req, res, next) => {
    try {
      const { role } = req.body;

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if username already exists
      if (req.body.username) {
        const existingUsername = await storage.getUserByUsername(req.body.username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);

      // Create user based on role
      if (role === UserRole.SCHOOL) {
        // Register school
        const schoolData = req.body as SchoolRegister;
        
        // Create the user
        const user = await storage.createUser({
          email: schoolData.email,
          username: schoolData.username,
          password: hashedPassword,
          role: UserRole.SCHOOL,
        });

        // Create the school
        await storage.createSchool({
          name: schoolData.name,
          adminName: schoolData.adminName,
          address: schoolData.address || null,
          userId: user.id,
        });

        // Login
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(201).json(user);
        });
      } else if (role === UserRole.STUDENT) {
        // Register student
        const studentData = req.body as StudentRegister;
        
        // Verify school exists
        const school = await storage.getSchool(studentData.schoolId);
        if (!school) {
          return res.status(400).json({ message: "Selected school does not exist" });
        }

        // Create the user
        const user = await storage.createUser({
          email: studentData.email,
          username: studentData.username,
          password: hashedPassword,
          role: UserRole.STUDENT,
        });

        // Create the student
        await storage.createStudent({
          userId: user.id,
          schoolId: studentData.schoolId,
        });

        // Login
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(201).json(user);
        });
      } else if (role === UserRole.ADMIN) {
        // Register admin (simple user)
        const user = await storage.createUser({
          email: req.body.email,
          username: req.body.username,
          password: hashedPassword,
          role: UserRole.ADMIN,
        });

        // Login
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(201).json(user);
        });
      } else {
        return res.status(400).json({ message: "Invalid role specified" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Authentication failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Get schools (for student registration)
  app.get("/api/schools/list", async (req, res, next) => {
    try {
      const schools = await storage.getAllSchools();
      res.json(schools);
    } catch (error) {
      next(error);
    }
  });
}
