import type { z } from "zod";
import type { startInterviewSchema, agentCompleteSchema } from "./interviews.validator.js";

export type StartInterviewInput = z.infer<typeof startInterviewSchema>;
export type AgentCompleteInput = z.infer<typeof agentCompleteSchema>;

export type InterviewSessionContext = {
  interview_id: string;
  application_id: string;
  job_title: string;
  job_description: string;
  job_requirements: string;
  screening_questions: string[];
  candidate_first_name: string;
  candidate_last_name: string;
  resume_text: string;
};
