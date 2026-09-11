import { NextResponse } from "next/server";
import { getRoom, saveRoom } from "../../../../lib/kv";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const { playerId, type } = body;

  if (!code || !playerId) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
  }

  const isHost = room.host && room.host.id === playerId;
  const isGuest = room.guest && room.guest.id === playerId;
  if (!isHost && !isGuest) {
    return NextResponse.json({ error: "Joueur inconnu dans cette partie." }, { status: 403 });
  }

  if (type === "submit") {
    const { questionIndex, own, guess } = body;
    if (
      typeof questionIndex !== "number" ||
      questionIndex !== room.currentIndex ||
      !own ||
      !guess
    ) {
      return NextResponse.json({ error: "Réponse invalide." }, { status: 400 });
    }

    const key = String(questionIndex);
    const entry = room.answers[key] || {};

    if (isHost) {
      entry.hostOwn = own;
      entry.hostGuess = guess;
    } else {
      entry.guestOwn = own;
      entry.guestGuess = guess;
    }
    room.answers[key] = entry;

    const bothIn = entry.hostOwn != null && entry.guestOwn != null;
    if (bothIn && !room.revealed[key]) {
      room.revealed[key] = true;
      if (entry.hostGuess === entry.guestOwn) room.scores.host += 1;
      if (entry.guestGuess === entry.hostOwn) room.scores.guest += 1;
    }

    await saveRoom(room);
    return NextResponse.json({ ok: true });
  }

  if (type === "next") {
    const key = String(room.currentIndex);
    if (!room.revealed[key]) {
      return NextResponse.json({ error: "En attente des deux réponses." }, { status: 409 });
    }
    room.currentIndex += 1;
    if (room.currentIndex >= room.questions.length) {
      room.status = "finished";
    }
    await saveRoom(room);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Type d'action inconnu." }, { status: 400 });
}
