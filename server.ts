import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import session from "express-session";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("municipal.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'citizen',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    image_path TEXT,
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)").run(
    "Administrator",
    "admin@municipal.gov",
    "0000000000",
    hashedPassword,
    "admin"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(session({
    secret: "municipal-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 
    }
  }));

  // Multer setup for image uploads
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  });
  const upload = multer({ storage });

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // Auth Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.session.user) return next();
    res.status(401).json({ error: "Unauthorized" });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.session.user && req.session.user.role === "admin") return next();
    res.status(403).json({ error: "Forbidden" });
  };

  // --- API Routes ---

  // Register
  app.post("/api/auth/register", (req: any, res: any) => {
    const { name, email, phone, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)").run(
        name, email, phone, hashedPassword
      );
      const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(result.lastInsertRowid);
      req.session.user = user;
      res.json({ success: true, user });
    } catch (error) {
      res.status(400).json({ error: "Email already exists or invalid data" });
    }
  });

  // Login
  app.post("/api/auth/login", (req: any, res: any) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: any, res: any) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Get Current User
  app.get("/api/auth/me", (req: any, res: any) => {
    res.json({ user: req.session.user || null });
  });

  // Submit Complaint
  app.post("/api/complaints", isAuthenticated, upload.single("image"), (req: any, res: any) => {
    const { title, category, description, location } = req.body;
    const complaintId = "COMP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
      db.prepare(`
        INSERT INTO complaints (complaint_id, user_id, title, category, description, location, image_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(complaintId, req.session.user.id, title, category, description, location, imagePath);
      res.json({ success: true, complaintId });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit complaint" });
    }
  });

  // Get Citizen Complaints
  app.get("/api/citizen/complaints", isAuthenticated, (req: any, res: any) => {
    const complaints = db.prepare("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC").all(req.session.user.id);
    res.json(complaints);
  });

  // Admin: Get All Complaints with Filters
  app.get("/api/admin/complaints", isAdmin, (req, res) => {
    const { category, status, search } = req.query;
    let query = "SELECT c.*, u.name as citizen_name FROM complaints c JOIN users u ON c.user_id = u.id WHERE 1=1";
    const params = [];

    if (category) {
      query += " AND c.category = ?";
      params.push(category);
    }
    if (status) {
      query += " AND c.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (c.complaint_id LIKE ? OR c.title LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY c.created_at DESC";
    const complaints = db.prepare(query).all(...params);
    res.json(complaints);
  });

  // Admin: Update Complaint Status
  app.patch("/api/admin/complaints/:id", isAdmin, (req, res) => {
    const { status, remarks } = req.body;
    const { id } = req.params;
    try {
      db.prepare("UPDATE complaints SET status = ?, remarks = ? WHERE id = ?").run(status, remarks, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  // Admin: Stats
  app.get("/api/admin/stats", isAdmin, (req, res) => {
    const total = db.prepare("SELECT COUNT(*) as count FROM complaints").get().count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'").get().count;
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get().count;
    const resolved = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get().count;
    
    const categoryStats = db.prepare("SELECT category, COUNT(*) as count FROM complaints GROUP BY category").all();
    const statusStats = db.prepare("SELECT status, COUNT(*) as count FROM complaints GROUP BY status").all();

    res.json({
      summary: { total, pending, inProgress, resolved },
      categoryStats,
      statusStats
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
