import "dotenv/config";
import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import authRouter from "./module/auth/auth.routes.js";
import jobsRouter from "./module/jobs/jobs.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

app.use(
  express.json(),
  cookieParser(),
  ((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  }) as express.RequestHandler
);

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);

app.use(errorMiddleware);

server.listen(4000, () => {
  console.log("HireFlow API running on http://localhost:4000");
});
