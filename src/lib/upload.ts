import multer from "multer";
import { ValidationError } from "../shared/errors.js";

const ONE_MB = 1 * 1024 * 1024;

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ONE_MB },
  fileFilter(_req, file, cb) {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new ValidationError("Only PDF files are accepted"));
  },
});
