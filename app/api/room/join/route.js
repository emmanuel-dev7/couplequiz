import { NextResponse } from "next/server";
import { getRoom, saveRoom } from "../../../../lib/kv";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const guestName = (body.name || "Joueur 2").slice(0, 24);

  if (!code) {
    return NextResponse.json({ error: "Code manquant." }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Cette partie n'existe pas ou a expiré." }, { status: 404 });
  }

  if (room.guest && room.guest.id) {
    return NextResponse.json({ error: "Cette partie est déjà complète." }, { status: 409 });
  }

  const playerId = crypto.randomUUID();
  room.guest = { id: playerId, name: guestName };
  room.status = "playing";

  await saveRoom(room);

  return NextResponse.json({ code, playerId, role: "guest" });
}
