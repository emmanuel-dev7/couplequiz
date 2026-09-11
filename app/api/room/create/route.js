import { NextResponse } from "next/server";
import { getRoom, saveRoom, generateCode } from "../../../../lib/kv";
import { QUESTIONS } from "../../../../lib/questions";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const hostName = (body.name || "Joueur 1").slice(0, 24);

  let code;
  for (let tries = 0; tries < 5; tries++) {
    code = generateCode();
    const existing = await getRoom(code);
    if (!existing) break;
  }

  const playerId = crypto.randomUUID();

  const room = {
    code,
    createdAt: Date.now(),
    status: "waiting", // waiting | playing | finished
    questions: shuffle(QUESTIONS).slice(0, 12),
    currentIndex: 0,
    host: { id: playerId, name: hostName },
    guest: null,
    answers: {}, // { [index]: { hostOwn, hostGuess, guestOwn, guestGuess } }
    revealed: {},
    scores: { host: 0, guest: 0 },
  };

  await saveRoom(room);

  return NextResponse.json({ code, playerId, role: "host" });
}
