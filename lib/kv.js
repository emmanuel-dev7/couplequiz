import { Redis } from "@upstash/redis";

const ROOM_TTL_SECONDS = 60 * 60 * 24; // 24h

// Reads connection details from the environment variables that Vercel's
// Upstash Redis / KV integration sets automatically once connected to the
// project: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// (older KV integrations expose the same values as KV_REST_API_URL /
// KV_REST_API_TOKEN, which are supported here too).
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export function roomKey(code) {
  return `room:${code.toUpperCase()}`;
}

export async function getRoom(code) {
  const room = await redis.get(roomKey(code));
  return room || null;
}

export async function saveRoom(room) {
  await redis.set(roomKey(room.code), room, { ex: ROOM_TTL_SECONDS });
  return room;
}

export function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
