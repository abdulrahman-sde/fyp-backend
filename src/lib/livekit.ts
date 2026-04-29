import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
// URL the candidate's browser should connect to. Defaults to LIVEKIT_URL,
// but in Docker dev the backend uses host.docker.internal (unreachable from a browser),
// so LIVEKIT_PUBLIC_URL lets us return a browser-reachable URL (e.g. ws://localhost:7880).
const LIVEKIT_PUBLIC_URL = process.env.LIVEKIT_PUBLIC_URL || LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("[livekit] Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET — interview rooms will fail");
}

const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
const roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export type RoomMetadata = {
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

export async function createInterviewRoom(roomName: string, metadata: RoomMetadata): Promise<void> {
  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 5 * 60,
    maxParticipants: 2,
    metadata: JSON.stringify(metadata),
  });
}

export async function generateCandidateAccessToken(
  roomName: string,
  identity: string,
  name: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: 60 * 60,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

export function getLiveKitWsUrl(): string {
  return LIVEKIT_PUBLIC_URL;
}
