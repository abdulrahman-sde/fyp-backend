import "dotenv/config";
import express from "express";
import http from "http";
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
];

const FRONTEND_ORIGINS = (
  process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN
)
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = FRONTEND_ORIGINS?.length
  ? FRONTEND_ORIGINS
  : DEFAULT_FRONTEND_ORIGINS;

app.use(express.json(), cookieParser(), ((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (
    typeof requestOrigin === "string" &&
    ALLOWED_ORIGINS.includes(requestOrigin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  } else if (!requestOrigin && ALLOWED_ORIGINS.length > 0) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}) as express.RequestHandler);

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
