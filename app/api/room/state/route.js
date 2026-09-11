import { NextResponse } from "next/server";
import { getRoom } from "../../../../lib/kv";

// Hide the partner's not-yet-revealed answers so nobody can peek by
// reading network responses.
function sanitize(room, viewerId) {
  const isHost = room.host && room.host.id === viewerId;
  const isGuest = room.guest && room.guest.id === viewerId;

  const answers = {};
  for (const [idx, a] of Object.entries(room.answers)) {
    const revealed = !!room.revealed[idx];
    const mine = {};
    if (revealed) {
      Object.assign(mine, a);
    } else {
      // Only expose whether each side has submitted, not the content.
      mine.hostSubmitted = a.hostOwn != null && a.hostGuess != null;
      mine.guestSubmitted = a.guestOwn != null && a.guestGuess != null;
      // Let a player see their own submitted values so their UI can persist.
      if (isHost) {
        if (a.hostOwn != null) mine.myOwn = a.hostOwn;
        if (a.hostGuess != null) mine.myGuess = a.hostGuess;
      }
      if (isGuest) {
        if (a.guestOwn != null) mine.myOwn = a.guestOwn;
        if (a.guestGuess != null) mine.myGuess = a.guestGuess;
      }
    }
    answers[idx] = mine;
  }

  return {
    code: room.code,
    status: room.status,
    questions: room.questions,
    currentIndex: room.currentIndex,
    host: room.host,
    guest: room.guest,
    scores: room.scores,
    revealed: room.revealed,
    answers,
    viewerRole: isHost ? "host" : isGuest ? "guest" : null,
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();
  const playerId = searchParams.get("playerId") || "";

  if (!code) {
    return NextResponse.json({ error: "Code manquant." }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
  }

  return NextResponse.json(sanitize(room, playerId));
}
