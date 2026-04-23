export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
export const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_MS / 1000;

export const COOKIE_NAMES = {
  ACCESS: "hf_access",
  REFRESH: "hf_refresh",
} as const;
