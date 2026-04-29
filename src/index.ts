import "dotenv/config";
import express from "express";
import http from "http";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./module/auth/auth.routes.js";
import jobsRouter from "./module/jobs/jobs.routes.js";
import applicationsRouter from "./module/applications/applications.routes.js";
import interviewsRouter from "./module/interviews/interviews.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();
const server = http.createServer(app);

const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "https://fyp-candidate-frontend-a3okr93xi.vercel.app",
  "https://fyp-reccruiter-frontend.vercel.app",
] as const;

const FRONTEND_ORIGINS = (
  process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN
)
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS: readonly string[] = FRONTEND_ORIGINS?.length
  ? FRONTEND_ORIGINS
  : DEFAULT_FRONTEND_ORIGINS;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/interviews", interviewsRouter);

app.use(errorMiddleware);

app.get("/", (_req, res) => {
  res.send("Welcome to HireFlow API");
});
server.listen(4000, () => {
  console.log("HireFlow API running on http://localhost:4000");
});
