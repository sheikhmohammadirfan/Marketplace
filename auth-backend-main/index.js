const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const listingRoutes = require("./routes/listings");
const chatRoutes = require("./routes/chat");
const aiRoutes = require("./routes/ai");
const wishlistRoutes = require("./routes/wishlist");
const { apiLimiter } = require("./middleware/rateLimit");
const { initSocket } = require("./socket");

dotenv.config();

const REQUIRED_ENV = ["MONGO_URL", "JWT_ACCESS_SECRET", "FRONTEND_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// Render sits behind a proxy — needed for correct req.ip / rate limiting / secure cookies.
app.set("trust proxy", 1);

app.use(helmet());

// CORS: allow the configured frontend origin(s) and send/receive cookies.
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"].filter(
  Boolean
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // curl/Postman/mobile
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // required so the browser sends/receives auth cookies cross-domain
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Limit is higher than a typical API because listing photos are sent as base64 JSON for MVP
// simplicity (no cloud storage wired up). For real scale, swap to multipart upload + S3/Cloudinary
// and drop this back down to ~100kb.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ / . operators from user input to block NoSQL injection

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.get("/", (req, res) => {
  res.json({ message: "🔐 Enterprise Auth API", status: "running", version: "3.0.0" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found", path: req.path });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Not allowed by CORS" });
  }
  console.error("❌ Global error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected:", mongoose.connection.db.databaseName))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Wrap in a plain http server so Express and Socket.io can share one port — required on Render.
const server = http.createServer(app);
const io = initSocket(server, allowedOrigins);
app.set("io", io); // lets REST controllers (e.g. chatController) emit socket events too

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
