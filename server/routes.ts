import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { UserRole } from "@shared/schema";
import { sendNotificationEmail } from "./email-service";
import Stripe from "stripe";
import * as paystackService from "./paystack-service";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

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
  
  // Middleware to check if user is a school or admin
  const isSchoolOrAdmin = (req, res, next) => {
    if (req.isAuthenticated() && 
        (req.user.role === UserRole.SCHOOL || req.user.role === UserRole.ADMIN)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden: School or Admin access required" });
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

  // Fundraiser routes for schools
  app.get("/api/school/fundraisers", isAuthenticated, hasRole(UserRole.SCHOOL), async (req, res) => {
    try {
      const school = await storage.getSchoolByUserId(req.user.id);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const fundraisers = await storage.getFundraisersBySchoolId(school.id);
      res.json(fundraisers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get fundraisers" });
    }
  });

  app.post("/api/school/fundraisers", isAuthenticated, hasRole(UserRole.SCHOOL), async (req, res) => {
    try {
      const school = await storage.getSchoolByUserId(req.user.id);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      console.log("Received fundraiser data:", req.body);
      const { event_name, location, eventDate, price } = req.body;
      // Ensure we're passing a valid date
      let formattedDate;
      try {
        if (typeof eventDate === 'string') {
          formattedDate = new Date(eventDate);
          
          // Check if it's a valid date
          if (isNaN(formattedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
          }
        } else {
          return res.status(400).json({ message: "Event date is required" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Validate price
      let priceInCents = 1000; // Default to $10.00
      if (price) {
        priceInCents = parseInt(price, 10);
        if (isNaN(priceInCents) || priceInCents <= 0) {
          return res.status(400).json({ message: "Price must be a positive number" });
        }
      }

      console.log("Creating fundraiser with:", {
        name: event_name, // We need 'name' instead of 'eventName'
        location,
        eventDate: formattedDate.toISOString().split('T')[0],
        price: priceInCents,
        schoolId: school.id,
        isActive: true
      });

      // Create the fundraiser with the validated date
      // Using a string formattable date for storage
      const fundraiser = await storage.createFundraiser({
        name: event_name, // name is the field in our schema now
        location,
        eventDate: formattedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD string
        price: priceInCents,
        schoolId: school.id,
        isActive: true
      });

      // Find students associated with this school and create notifications for them
      const schoolStudents = await storage.getStudentsWithUserInfoBySchoolId(school.id);
      
      const notificationTitle = "New Fundraiser Event";
      const notificationMessage = `Your school has added a new fundraiser: ${fundraiser.name} on ${fundraiser.eventDate} at ${fundraiser.location}`;
      
      // Create notifications for each student and send emails
      for (const student of schoolStudents) {
        // Create in-app notification
        await storage.createNotification({
          userId: student.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: "info",
          read: false
        });
        
        // Log notification for audit purposes (simulating email notification)
        if (student.email) {
          // Don't await - process asynchronously
          sendNotificationEmail(
            student.email,
            notificationTitle,
            notificationMessage
          ).catch(err => {
            console.error('Error processing notification:', err);
          });
        }
      }

      res.status(201).json(fundraiser);
    } catch (error) {
      res.status(500).json({ message: "Failed to create fundraiser" });
    }
  });

  // Fundraiser routes for students
  app.get("/api/student/fundraisers", isAuthenticated, hasRole(UserRole.STUDENT), async (req, res) => {
    try {
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const fundraisers = await storage.getFundraisersBySchoolId(student.schoolId);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Filter for current and upcoming fundraisers (event date is today or later)
      const upcomingFundraisers = fundraisers.filter(fundraiser => {
        return fundraiser.eventDate >= today;
      });
      
      res.json(upcomingFundraisers);
    } catch (error) {
      console.error("Error fetching student fundraisers:", error);
      res.status(500).json({ message: "Failed to get fundraisers" });
    }
  });
  
  // Get past fundraisers for a student
  app.get("/api/student/past-fundraisers", isAuthenticated, hasRole(UserRole.STUDENT), async (req, res) => {
    try {
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const fundraisers = await storage.getFundraisersBySchoolId(student.schoolId);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Filter for past events (event date is before today)
      const pastFundraisers = fundraisers.filter(fundraiser => {
        return fundraiser.eventDate < today;
      });
      
      res.json(pastFundraisers);
    } catch (error) {
      console.error("Error fetching past fundraisers:", error);
      res.status(500).json({ message: "Could not retrieve past fundraisers" });
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

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread notifications" });
    }
  });

  app.post("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const { title, message, type, recipientId } = req.body;
      const userId = recipientId || req.user.id;
      
      console.log('Creating notification:', {
        title,
        message,
        type,
        recipientId,
        userId,
        currentUser: req.user.id
      });
      
      // Create a notification
      const notification = await storage.createNotification({
        title,
        message,
        type,
        userId: userId,
        read: false
      });
      
      console.log('Notification created successfully:', notification);
      
      // Log notification for audit purposes (simulating email notification)
      if (recipientId && recipientId !== req.user.id) {
        // Get recipient user to find their email
        const recipient = await storage.getUser(recipientId);
        console.log('Recipient user:', recipient);
        
        if (recipient && recipient.email) {
          // Process notification asynchronously (don't await)
          sendNotificationEmail(
            recipient.email,
            title,
            message
          ).catch(err => {
            console.error('Error processing notification:', err);
          });
        }
      }
      
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });
  
  // Mass notification endpoint for sending to all students in a school
  app.post("/api/notifications/mass", isAuthenticated, isSchoolOrAdmin, async (req, res) => {
    try {
      const { title, message, type, schoolId } = req.body;
      
      // Security check - if school user, they can only send to their own school
      if (req.user.role === UserRole.SCHOOL) {
        const schoolUser = await storage.getSchoolByUserId(req.user.id);
        if (!schoolUser || schoolUser.id !== schoolId) {
          return res.status(403).json({ message: "You can only send notifications to students at your school" });
        }
      }
      
      console.log('Creating mass notification for school:', {
        title,
        message,
        type,
        schoolId,
        senderUserId: req.user.id
      });
      
      // Get all students for this school
      const students = await storage.getStudentsWithUserInfoBySchoolId(schoolId);
      console.log(`Found ${students.length} students for schoolId ${schoolId}`);
      
      if (students.length === 0) {
        return res.status(404).json({ message: "No students found for this school" });
      }
      
      // Create notifications for each student
      const notifications = [];
      
      console.log('Students data structure:', JSON.stringify(students[0], null, 2));
      
      for (const student of students) {
        // Handle both student.user.id and student.userId (depending on the structure)
        const studentUserId = student.user?.id || student.userId;
        
        console.log('Creating notification for student:', {
          studentId: student.id,
          userId: studentUserId,
        });
        
        const notification = await storage.createNotification({
          title,
          message,
          type,
          userId: studentUserId,
          read: false
        });
        
        notifications.push(notification);
        
        // Send email notification (simulated)
        const studentEmail = student.user?.email || student.email;
        if (studentEmail) {
          // Process notification asynchronously
          sendNotificationEmail(
            studentEmail,
            title,
            message
          ).catch(err => {
            console.error(`Error sending email to student ${studentUserId}:`, err);
          });
        }
      }
      
      console.log(`Successfully created ${notifications.length} notifications`);
      
      res.status(201).json({ 
        success: true, 
        count: notifications.length 
      });
    } catch (error) {
      console.error('Error creating mass notifications:', error);
      res.status(500).json({ message: "Failed to send mass notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  // Get single fundraiser by ID (public endpoint, no authentication required)
  app.get("/api/fundraisers/:id", async (req, res) => {
    try {
      const fundraiserId = parseInt(req.params.id);
      
      if (isNaN(fundraiserId)) {
        return res.status(400).json({ message: "Invalid fundraiser ID" });
      }
      
      const fundraiser = await storage.getFundraiser(fundraiserId);
      
      if (!fundraiser) {
        return res.status(404).json({ message: "Fundraiser not found" });
      }
      
      res.json(fundraiser);
    } catch (error) {
      console.error("Error getting fundraiser details:", error);
      res.status(500).json({ message: "Could not retrieve fundraiser details" });
    }
  });
  
  // Get school by ID (public endpoint, no authentication required)
  app.get("/api/schools/:id", async (req, res) => {
    try {
      const schoolId = parseInt(req.params.id);
      
      if (isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }
      
      const school = await storage.getSchool(schoolId);
      
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      res.json(school);
    } catch (error) {
      console.error("Error getting school details:", error);
      res.status(500).json({ message: "Could not retrieve school details" });
    }
  });

  // Stripe payment endpoints - allow both authenticated and non-authenticated users
  app.post("/api/create-payment-intent", async (req, res) => {
    // Log the request details to help debug
    console.log("Create payment intent request received:", {
      body: req.body,
      isAuthenticated: req.isAuthenticated(),
      user: req.isAuthenticated() && req.user ? { id: req.user.id } : null,
    });
    try {
      const { fundraiserId, quantity, customerInfo } = req.body;
      
      if (!fundraiserId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "Missing or invalid parameters" });
      }
      
      // Validate quantity to prevent abuse
      if (quantity > 10) {
        return res.status(400).json({ message: "Maximum 10 tickets per order" });
      }
      
      // Get fundraiser details
      const fundraiser = await storage.getFundraiser(fundraiserId);
      if (!fundraiser) {
        return res.status(404).json({ message: "Fundraiser not found" });
      }
      
      // Make sure fundraiser is active
      if (!fundraiser.isActive) {
        return res.status(400).json({ message: "This fundraiser is not currently active" });
      }
      
      // Use a fixed price for now (in cents)
      const ticketPrice = 1000; // $10 in cents
      
      // Calculate amount
      const amount = ticketPrice * quantity;
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is required" });
      }
      
      try {
        // Create payment intent metadata
        const metadata: Record<string, string> = {
          fundraiserId: fundraiserId.toString(),
          quantity: quantity.toString(),
          customerName: customerInfo.name || "",
          customerEmail: customerInfo.email || "",
        };
        
        // Add optional info
        if (customerInfo.phone) {
          metadata.customerPhone = customerInfo.phone;
        }
        
        // Add user ID if authenticated
        if (req.isAuthenticated() && req.user && req.user.id) {
          metadata.userId = req.user.id.toString();
        }
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          metadata,
        });
        
        // Return the client secret to the client
        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: amount / 100, // Convert back to dollars for display
        });
      } catch (stripeError: any) {
        console.error("Stripe API error:", stripeError);
        const errorMessage = stripeError.message || "Payment processing error";
        return res.status(400).json({ message: errorMessage });
      }
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: error.message || "Could not process payment" });
    }
  });
  
  // Cart checkout - create payment intent for multiple items
  app.post("/api/cart/create-payment-intent", async (req, res) => {
    // Log the request details to help debug
    console.log("Cart payment intent request received:", {
      body: req.body,
      isAuthenticated: req.isAuthenticated(),
      user: req.isAuthenticated() && req.user ? { id: req.user.id } : null,
    });
    
    try {
      const { items, customerInfo } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is required" });
      }
      
      // Fixed ticket price (in cents)
      const ticketPrice = 1000; // $10 in cents
      
      // Calculate total amount and prepare item details
      let totalAmount = 0;
      const itemDetails = [];
      
      for (const item of items) {
        if (!item.fundraiserId || !item.quantity || item.quantity < 1) {
          return res.status(400).json({ message: "Invalid item data" });
        }
        
        // Validate quantity to prevent abuse
        if (item.quantity > 10) {
          return res.status(400).json({ message: "Maximum 10 tickets per fundraiser" });
        }
        
        // Get fundraiser details
        const fundraiser = await storage.getFundraiser(item.fundraiserId);
        if (!fundraiser) {
          return res.status(400).json({ message: `Fundraiser with ID ${item.fundraiserId} not found` });
        }
        
        // Make sure fundraiser is active
        if (!fundraiser.isActive) {
          return res.status(400).json({ message: `Fundraiser '${fundraiser.name}' is not currently active` });
        }
        
        // Calculate item amount
        const itemAmount = ticketPrice * item.quantity;
        totalAmount += itemAmount;
        
        // Add to item details
        itemDetails.push({
          fundraiserId: item.fundraiserId,
          name: fundraiser.name,
          quantity: item.quantity,
          amount: itemAmount
        });
      }
      
      try {
        // Create payment intent metadata
        const metadata: Record<string, string> = {
          cartItems: JSON.stringify(itemDetails),
          customerName: customerInfo.name || "",
          customerEmail: customerInfo.email || "",
          itemCount: items.length.toString()
        };
        
        // Add optional info
        if (customerInfo.phone) {
          metadata.customerPhone = customerInfo.phone;
        }
        
        // Add user ID if authenticated
        if (req.isAuthenticated() && req.user && req.user.id) {
          metadata.userId = req.user.id.toString();
        }
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalAmount,
          currency: "usd",
          metadata,
        });
        
        // Return the client secret to the client
        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: totalAmount / 100, // Convert back to dollars for display
        });
      } catch (stripeError: any) {
        console.error("Stripe API error:", stripeError);
        const errorMessage = stripeError.message || "Payment processing error";
        return res.status(400).json({ message: errorMessage });
      }
    } catch (error: any) {
      console.error("Error creating cart payment intent:", error);
      res.status(500).json({ message: error.message || "Could not process payment" });
    }
  });

  // Stripe webhook for handling payment events
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    // Verify webhook signature
    try {
      // In a production application, you should use a proper webhook secret
      // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      // event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      
      // For development/testing, we'll trust the request
      event = req.body;
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      try {
        const paymentIntent = event.data.object;
        
        // Extract metadata
        const metadata = paymentIntent.metadata || {};
        
        console.log('Payment succeeded - processing payment record:', metadata);
        
        // Check if this is a cart payment (multiple items)
        if (metadata.cartItems) {
          // Handle cart purchase - multiple fundraisers
          await handleCartPaymentSuccess(paymentIntent, metadata);
        } else {
          // Handle single fundraiser purchase
          await handleSinglePaymentSuccess(paymentIntent, metadata);
        }
        
        console.log('Payment processing completed successfully');
      } catch (error) {
        console.error('Error processing payment success:', error);
        // We still return 200 to Stripe as we don't want them to retry
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
  });
  
  // Helper function to handle cart payment success (multiple items)
  async function handleCartPaymentSuccess(paymentIntent: any, metadata: any) {
    try {
      const {
        cartItems,
        customerName,
        customerEmail,
        customerPhone,
        userId
      } = metadata;
      
      // Parse cart items
      const items = JSON.parse(cartItems);
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Invalid cart items data');
      }
      
      // Find student ID if the user is a student
      let studentId = null;
      if (userId) {
        const user = await storage.getUser(parseInt(userId, 10));
        if (user && user.role === UserRole.STUDENT) {
          const student = await storage.getStudentByUserId(user.id);
          if (student) {
            studentId = student.id;
          }
        }
      }
      
      // Record each ticket purchase separately
      for (const item of items) {
        await storage.createTicketPurchase({
          fundraiserId: item.fundraiserId,
          studentId: studentId ? studentId : null,
          customerName,
          customerEmail, 
          customerPhone: customerPhone || null,
          quantity: item.quantity,
          amount: item.amount,
          paymentIntentId: paymentIntent.id,
          paymentStatus: 'completed'
        });
      }
      
      console.log(`Successfully recorded ${items.length} ticket purchases from cart`);
    } catch (error) {
      console.error('Error handling cart payment success:', error);
      throw error;
    }
  }
  
  // Helper function to handle single fundraiser payment success
  async function handleSinglePaymentSuccess(paymentIntent: any, metadata: any) {
    try {
      const {
        fundraiserId,
        quantity,
        customerName,
        customerEmail,
        customerPhone,
        userId
      } = metadata;
      
      if (!fundraiserId || !quantity) {
        throw new Error('Missing required payment metadata');
      }
      
      // Find student ID if the user is a student
      let studentId = null;
      if (userId) {
        const user = await storage.getUser(parseInt(userId, 10));
        if (user && user.role === UserRole.STUDENT) {
          const student = await storage.getStudentByUserId(user.id);
          if (student) {
            studentId = student.id;
          }
        }
      }
      
      // Record the ticket purchase
      await storage.createTicketPurchase({
        fundraiserId: parseInt(fundraiserId, 10),
        studentId: studentId ? studentId : null,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        quantity: parseInt(quantity, 10),
        amount: paymentIntent.amount,
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'completed'
      });
      
      console.log('Single ticket purchase recorded successfully');
    } catch (error) {
      console.error('Error handling single payment success:', error);
      throw error;
    }
  }

  // Get sales summary for a student
  app.get("/api/student/sales-summary", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== UserRole.STUDENT) {
        return res.status(403).json({ message: "Only students can access their sales summary" });
      }

      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      const summary = await storage.getTicketSalesSummaryByStudent(student.id);
      res.json(summary);
    } catch (error) {
      console.error("Error getting student sales summary:", error);
      res.status(500).json({ message: "Could not retrieve sales summary" });
    }
  });

  // Get detailed ticket purchases for a student
  app.get("/api/student/ticket-purchases", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== UserRole.STUDENT) {
        return res.status(403).json({ message: "Only students can access their ticket purchases" });
      }

      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      const ticketPurchases = await storage.getTicketPurchasesByStudentId(student.id);
      res.json(ticketPurchases);
    } catch (error) {
      console.error("Error getting student ticket purchases:", error);
      res.status(500).json({ message: "Could not retrieve ticket purchases" });
    }
  });
  
  // Cash payment endpoint for single fundraiser
  app.post("/api/cash-payment", isAuthenticated, async (req, res) => {
    try {
      // Check if user is a student or school admin (only they can record cash payments)
      if (req.user.role !== UserRole.STUDENT && req.user.role !== UserRole.SCHOOL) {
        return res.status(403).json({ message: "Only students and school admins can record cash payments" });
      }
      
      const { fundraiserId, quantity, customerInfo } = req.body;
      
      if (!fundraiserId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "Missing or invalid parameters" });
      }
      
      // Validate quantity to prevent abuse
      if (quantity > 10) {
        return res.status(400).json({ message: "Maximum 10 tickets per order" });
      }
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is required" });
      }
      
      // Get fundraiser details
      const fundraiser = await storage.getFundraiser(fundraiserId);
      if (!fundraiser) {
        return res.status(404).json({ message: "Fundraiser not found" });
      }
      
      // Fixed price at $10 per ticket (in cents)
      const ticketPrice = 1000;
      const amount = ticketPrice * quantity;
      
      // Find student ID if the user is a student
      let studentId = null;
      if (req.user.role === UserRole.STUDENT) {
        const student = await storage.getStudentByUserId(req.user.id);
        if (student) {
          studentId = student.id;
        }
      }
      
      // Create a payment record for cash payment
      const paymentId = `cash_payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Record the ticket purchase
      const ticketPurchase = await storage.createTicketPurchase({
        fundraiserId: parseInt(fundraiserId, 10),
        studentId: studentId,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone || null,
        quantity: parseInt(quantity, 10),
        amount: amount,
        paymentIntentId: paymentId,
        paymentStatus: "completed"
      });
      
      res.status(201).json({
        success: true,
        message: "Cash payment recorded successfully",
        ticketPurchase
      });
    } catch (error) {
      console.error("Error processing cash payment:", error);
      res.status(500).json({ message: "Failed to process cash payment" });
    }
  });
  
  // Cash payment endpoint for cart purchases
  app.post("/api/cart/cash-payment", async (req, res) => {
    try {
      // Allow anyone to record cash payments (authenticated or not)
      
      const { items, customerInfo } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is required" });
      }
      
      // Fixed ticket price (in cents)
      const ticketPrice = 1000; // $10 in cents
      
      // Generate a unique cash payment identifier
      const paymentId = `cash_payment_cart_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Find student ID if the user is authenticated and is a student
      let studentId = null;
      if (req.isAuthenticated() && req.user && req.user.role === UserRole.STUDENT) {
        const student = await storage.getStudentByUserId(req.user.id);
        if (student) {
          studentId = student.id;
        }
      }
      
      // Record each ticket purchase separately
      const ticketPurchases = [];
      for (const item of items) {
        if (!item.fundraiserId || !item.quantity || item.quantity < 1) {
          return res.status(400).json({ message: "Invalid item data" });
        }
        
        // Validate quantity to prevent abuse
        if (item.quantity > 10) {
          return res.status(400).json({ message: "Maximum 10 tickets per fundraiser" });
        }
        
        // Get fundraiser details
        const fundraiser = await storage.getFundraiser(item.fundraiserId);
        if (!fundraiser) {
          return res.status(400).json({ message: `Fundraiser with ID ${item.fundraiserId} not found` });
        }
        
        // Calculate amount for this item
        const itemAmount = ticketPrice * item.quantity;
        
        // Record this purchase
        const purchase = await storage.createTicketPurchase({
          fundraiserId: item.fundraiserId,
          studentId: studentId,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone || null,
          quantity: item.quantity,
          amount: itemAmount,
          paymentIntentId: paymentId, // Same ID for all items in cart
          paymentStatus: "completed"
        });
        
        ticketPurchases.push(purchase);
      }
      
      res.status(201).json({
        success: true,
        message: `Successfully recorded ${ticketPurchases.length} cash payments from cart`,
        ticketPurchases
      });
    } catch (error) {
      console.error("Error processing cart cash payment:", error);
      res.status(500).json({ message: "Failed to process cart cash payment" });
    }
  });
  
  // Test endpoint to create a ticket purchase (for development only)
  app.post("/api/test/create-ticket-purchase", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== UserRole.STUDENT) {
        return res.status(403).json({ message: "Only students can create test ticket purchases" });
      }
      
      const { fundraiserId, quantity, amount } = req.body;
      if (!fundraiserId || !quantity || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }
      
      // Create a test ticket purchase
      const ticketPurchase = await storage.createTicketPurchase({
        fundraiserId: parseInt(fundraiserId, 10),
        studentId: student.id,
        customerName: req.user.username || "Test Customer",
        customerEmail: req.user.email || "test@example.com",
        customerPhone: null,
        quantity: parseInt(quantity, 10),
        amount: parseInt(amount, 10) * 100, // Convert to cents
        paymentIntentId: `test_pi_${Date.now()}`,
        paymentStatus: "completed"
      });
      
      res.status(201).json({
        message: "Test ticket purchase created successfully",
        ticketPurchase
      });
    } catch (error) {
      console.error("Error creating test ticket purchase:", error);
      res.status(500).json({ message: "Failed to create test ticket purchase" });
    }
  });

  // Paystack payment verification for individual fundraiser
  app.post("/api/paystack/verify", async (req, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Transaction reference is required" });
      }
      
      // Verify the transaction with Paystack
      const transaction = await paystackService.verifyTransaction(reference);
      
      if (!transaction) {
        return res.status(400).json({ message: "Failed to verify transaction" });
      }
      
      if (transaction.status !== 'success') {
        return res.status(400).json({ message: `Transaction status: ${transaction.status}` });
      }
      
      // Get metadata from the transaction
      const metadata = transaction.metadata || {};
      const { fundraiserId, quantity, customerInfo } = metadata;
      
      if (!fundraiserId || !quantity) {
        return res.status(400).json({ message: "Invalid transaction metadata" });
      }
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is missing" });
      }
      
      // Calculate the amount based on the received data
      const ticketPrice = 1000; // $10 in cents
      const amount = ticketPrice * quantity;
      
      // Compare with the transaction amount (convert from kobo to cents)
      const transactionAmount = transaction.amount / 100; // Convert kobo to dollars
      
      if (transactionAmount < amount) {
        return res.status(400).json({ message: "Payment amount is insufficient" });
      }
      
      // Find student ID if the user is authenticated and is a student
      let studentId = null;
      if (req.isAuthenticated() && req.user && req.user.role === UserRole.STUDENT) {
        const student = await storage.getStudentByUserId(req.user.id);
        if (student) {
          studentId = student.id;
        }
      }
      
      // Record the ticket purchase
      const ticketPurchase = await storage.createTicketPurchase({
        fundraiserId: parseInt(fundraiserId, 10),
        studentId: studentId,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone || null,
        quantity: parseInt(quantity, 10),
        amount: amount,
        paymentIntentId: reference,
        paymentStatus: "completed"
      });
      
      res.status(200).json({
        success: true,
        message: "Payment verified and ticket purchase recorded",
        ticketPurchase
      });
    } catch (error) {
      console.error("Error verifying Paystack payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });
  
  // Paystack payment verification for cart checkout
  app.post("/api/paystack/verify-cart", async (req, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Transaction reference is required" });
      }
      
      // Verify the transaction with Paystack
      const transaction = await paystackService.verifyTransaction(reference);
      
      if (!transaction) {
        return res.status(400).json({ message: "Failed to verify transaction" });
      }
      
      if (transaction.status !== 'success') {
        return res.status(400).json({ message: `Transaction status: ${transaction.status}` });
      }
      
      // Get metadata from the transaction
      const metadata = transaction.metadata || {};
      const { isCart, items, customerInfo } = metadata;
      
      if (!isCart || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid cart data in transaction metadata" });
      }
      
      // Validate customer info
      if (!customerInfo || !customerInfo.name || !customerInfo.email) {
        return res.status(400).json({ message: "Customer information is missing" });
      }
      
      // Find student ID if the user is authenticated and is a student
      let studentId = null;
      if (req.isAuthenticated() && req.user && req.user.role === UserRole.STUDENT) {
        const student = await storage.getStudentByUserId(req.user.id);
        if (student) {
          studentId = student.id;
        }
      }
      
      // Calculate total expected amount
      const ticketPrice = 1000; // $10 in cents
      let expectedAmount = 0;
      for (const item of items) {
        expectedAmount += ticketPrice * item.quantity;
      }
      
      // Compare with the transaction amount (convert from kobo to cents)
      const transactionAmount = transaction.amount / 100; // Convert kobo to dollars
      
      if (transactionAmount < expectedAmount) {
        return res.status(400).json({ message: "Payment amount is insufficient" });
      }
      
      // Record each ticket purchase separately
      const ticketPurchases = [];
      for (const item of items) {
        if (!item.fundraiserId || !item.quantity || item.quantity < 1) {
          return res.status(400).json({ message: "Invalid item in cart" });
        }
        
        // Get fundraiser details to validate it exists
        const fundraiser = await storage.getFundraiser(item.fundraiserId);
        if (!fundraiser) {
          return res.status(400).json({ message: `Fundraiser with ID ${item.fundraiserId} not found` });
        }
        
        // Calculate amount for this item
        const itemAmount = ticketPrice * item.quantity;
        
        // Record this purchase
        const purchase = await storage.createTicketPurchase({
          fundraiserId: item.fundraiserId,
          studentId: studentId,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone || null,
          quantity: item.quantity,
          amount: itemAmount,
          paymentIntentId: reference, // Same reference for all items in cart
          paymentStatus: "completed"
        });
        
        ticketPurchases.push(purchase);
      }
      
      res.status(200).json({
        success: true,
        message: `Successfully verified payment and recorded ${ticketPurchases.length} ticket purchases`,
        ticketPurchases
      });
    } catch (error) {
      console.error("Error verifying Paystack cart payment:", error);
      res.status(500).json({ message: "Failed to verify cart payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
