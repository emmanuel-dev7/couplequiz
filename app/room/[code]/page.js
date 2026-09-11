"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const POLL_MS = 1500;

export default function RoomPage() {
  const { code } = useParams();
  const router = useRouter();
  const roomCode = String(code).toUpperCase();

  const [session, setSession] = useState(null); // { playerId, role }
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [selectedOwn, setSelectedOwn] = useState(null);
  const [selectedGuess, setSelectedGuess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownCustomMode, setOwnCustomMode] = useState(false);
  const [ownCustomText, setOwnCustomText] = useState("");
  const [guessCustomMode, setGuessCustomMode] = useState(false);
  const [guessCustomText, setGuessCustomText] = useState("");

  const lastIndexRef = useRef(-1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`qc:${roomCode}`);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, [roomCode]);

  async function fetchState(playerId) {
    try {
      const res = await fetch(
        `/api/room/state?code=${roomCode}&playerId=${playerId || ""}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Erreur de chargement.");
        return;
      }
      setLoadError("");
      setState(data);
    } catch {
      setLoadError("Impossible de contacter le serveur.");
    }
  }

  useEffect(() => {
    if (!session) return;
    fetchState(session.playerId);
    const id = setInterval(() => fetchState(session.playerId), POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, roomCode]);

  // Reset local selections when the active question changes.
  useEffect(() => {
    if (!state) return;
    if (state.currentIndex !== lastIndexRef.current) {
      lastIndexRef.current = state.currentIndex;
      setSelectedOwn(null);
      setSelectedGuess(null);
      setOwnCustomMode(false);
      setOwnCustomText("");
      setGuessCustomMode(false);
      setGuessCustomText("");
    }
  }, [state?.currentIndex]);

  async function handleJoinHere() {
    setJoinError("");
    setJoining(true);
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode, name: joinName || "Joueur 2" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");
      const newSession = { playerId: data.playerId, role: data.role };
      localStorage.setItem(`qc:${roomCode}`, JSON.stringify(newSession));
      setSession(newSession);
    } catch (e) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmit(own, guess) {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/room/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: roomCode,
          playerId: session.playerId,
          type: "submit",
          questionIndex: state.currentIndex,
          own,
          guess,
        }),
      });
      await fetchState(session.playerId);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (!session) return;
    await fetch("/api/room/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode, playerId: session.playerId, type: "next" }),
    });
    await fetchState(session.playerId);
  }

  function copyLink() {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  // --- No local session: offer to join this specific room ---
  if (!session) {
    return (
      <div className="screen">
        <div className="room-wrap">
          <div className="question-card lobby-box">
            <h2>Rejoindre la partie {roomCode}</h2>
            <p>Entre ton prénom pour rejoindre cette partie à deux.</p>
            <label className="field-label" htmlFor="here-name">
              Ton prénom
            </label>
            <input
              id="here-name"
              className="text-input"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Ex. Sacha"
              maxLength={24}
            />
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={handleJoinHere}
              disabled={joining}
            >
              Rejoindre
            </button>
            {joinError && <p className="error-text">{joinError}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="screen">
        <div className="room-wrap">
          <div className="question-card lobby-box">
            <h2>Oups</h2>
            <p>{loadError}</p>
            <button className="btn btn-ghost" onClick={() => router.push("/")}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="screen">
        <p style={{ color: "var(--lavender)" }}>Chargement…</p>
      </div>
    );
  }

  const hostName = state.host?.name || "Joueur 1";
  const guestName = state.guest?.name || "Joueur 2";
  const myRole = state.viewerRole;

  // --- Waiting for the second player ---
  if (state.status === "waiting") {
    return (
      <div className="screen">
        <div className="room-wrap">
          <div className="question-card lobby-box">
            <h2>En attente de {guestName === "Joueur 2" ? "ton/ta partenaire" : guestName}…</h2>
            <p>Partage ce code pour commencer à jouer ensemble.</p>
            <div className="copy-row">
              <span className="big-code">{roomCode}</span>
            </div>
            <button className="btn btn-secondary" onClick={copyLink}>
              {copied ? "Lien copié !" : "Copier le lien de la partie"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Finished ---
  if (state.status === "finished") {
    const { host, guest } = state.scores;
    let resultLine;
    if (host > guest) resultLine = `${hostName} connaît mieux ${guestName} !`;
    else if (guest > host) resultLine = `${guestName} connaît mieux ${hostName} !`;
    else resultLine = "Égalité parfaite, vous vous connaissez pareil !";

    return (
      <div className="screen">
        <div className="room-wrap">
          <div className="question-card final-card">
            <h2>Partie terminée</h2>
            <p>{resultLine}</p>
            <div className="score-row">
              <div className="score-chip host">
                <div className="name">{hostName}</div>
                <div className="score">{host}</div>
              </div>
              <span className="vs-mark">&amp;</span>
              <div className="score-chip guest">
                <div className="name">{guestName}</div>
                <div className="score">{guest}</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => router.push("/")}>
              Rejouer une nouvelle partie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing ---
  const idx = state.currentIndex;
  const question = state.questions[idx];
  const entry = state.answers[String(idx)] || {};
  const revealed = !!state.revealed[idx];

  const iAmHost = myRole === "host";
  const iSubmitted = revealed
    ? true
    : iAmHost
    ? !!entry.hostSubmitted
    : !!entry.guestSubmitted;
  const partnerSubmitted = revealed
    ? true
    : iAmHost
    ? !!entry.guestSubmitted
    : !!entry.hostSubmitted;

  const myName = iAmHost ? hostName : guestName;
  const partnerName = iAmHost ? guestName : hostName;

  const myOwnSaved = entry.myOwn;
  const myGuessSaved = entry.myGuess;

  const own = selectedOwn ?? myOwnSaved ?? null;
  const guess = selectedGuess ?? myGuessSaved ?? null;

  const canSubmit = own && guess && !iSubmitted && !submitting;

  return (
    <div className="screen">
      <div className="room-wrap">
        <div className="room-code-pill">
          Partie <strong>{roomCode}</strong>
        </div>

        <div className="score-row">
          <div className="score-chip host">
            <div className="name">{hostName}</div>
            <div className="score">{state.scores.host}</div>
          </div>
          <span className="vs-mark">&amp;</span>
          <div className="score-chip guest">
            <div className="name">{guestName}</div>
            <div className="score">{state.scores.guest}</div>
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${(idx / state.questions.length) * 100}%` }}
          />
        </div>

        <div className="question-card">
          <div className="question-num">
            Question {idx + 1} / {state.questions.length}
          </div>
          <h2 className="question-text">{question.text}</h2>

          {!revealed && (
            <>
              <div className="answer-block">
                <div className="answer-block-title">Ta réponse, {myName}</div>
                <div className="option-grid">
                  {question.options.map((opt) => (
                    <button
                      key={opt}
                      className={`option-btn ${!ownCustomMode && own === opt ? "selected" : ""}`}
                      disabled={iSubmitted}
                      onClick={() => {
                        setOwnCustomMode(false);
                        setSelectedOwn(opt);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    className={`option-btn ${ownCustomMode ? "selected" : ""}`}
                    disabled={iSubmitted}
                    onClick={() => {
                      setOwnCustomMode(true);
                      setSelectedOwn(ownCustomText || "");
                    }}
                  >
                    Autre…
                  </button>
                </div>
                {ownCustomMode && !iSubmitted && (
                  <input
                    className="text-input"
                    style={{ marginTop: 10 }}
                    placeholder="Écris ta réponse"
                    maxLength={40}
                    value={ownCustomText}
                    onChange={(e) => {
                      setOwnCustomText(e.target.value);
                      setSelectedOwn(e.target.value);
                    }}
                  />
                )}
              </div>

              <div className="answer-block">
                <div className="answer-block-title">
                  Que va répondre {partnerName} d'après toi ?
                </div>
                <div className="option-grid">
                  {question.options.map((opt) => (
                    <button
                      key={opt}
                      className={`option-btn guess ${!guessCustomMode && guess === opt ? "selected guess" : ""}`}
                      disabled={iSubmitted}
                      onClick={() => {
                        setGuessCustomMode(false);
                        setSelectedGuess(opt);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    className={`option-btn guess ${guessCustomMode ? "selected guess" : ""}`}
                    disabled={iSubmitted}
                    onClick={() => {
                      setGuessCustomMode(true);
                      setSelectedGuess(guessCustomText || "");
                    }}
                  >
                    Autre…
                  </button>
                </div>
                {guessCustomMode && !iSubmitted && (
                  <input
                    className="text-input"
                    style={{ marginTop: 10 }}
                    placeholder="Écris ta supposition"
                    maxLength={40}
                    value={guessCustomText}
                    onChange={(e) => {
                      setGuessCustomText(e.target.value);
                      setSelectedGuess(e.target.value);
                    }}
                  />
                )}
              </div>

              {!iSubmitted ? (
                <button
                  className="btn btn-primary"
                  disabled={!canSubmit}
                  onClick={() => handleSubmit(own, guess)}
                >
                  Valider mes réponses
                </button>
              ) : (
                <p className="waiting-note">
                  {partnerSubmitted
                    ? "Les deux réponses sont là, révélation…"
                    : `En attente de ${partnerName}…`}
                </p>
              )}
            </>
          )}

          {revealed && (
            <div className="reveal-box">
              <div className="reveal-line">
                <span className="who">{hostName} a répondu</span>
                <span>{entry.hostOwn}</span>
              </div>
              <div className="reveal-line">
                <span className="who">{guestName} avait deviné</span>
                <span className="reveal-result">
                  {entry.guestGuess}{" "}
                  <span className={entry.guestGuess === entry.hostOwn ? "hit" : "miss"}>
                    {entry.guestGuess === entry.hostOwn ? "✓" : "✕"}
                  </span>
                </span>
              </div>
              <div className="reveal-line">
                <span className="who">{guestName} a répondu</span>
                <span>{entry.guestOwn}</span>
              </div>
              <div className="reveal-line">
                <span className="who">{hostName} avait deviné</span>
                <span className="reveal-result">
                  {entry.hostGuess}{" "}
                  <span className={entry.hostGuess === entry.guestOwn ? "hit" : "miss"}>
                    {entry.hostGuess === entry.guestOwn ? "✓" : "✕"}
                  </span>
                </span>
              </div>

              <button className="btn btn-secondary" onClick={handleNext}>
                {idx + 1 >= state.questions.length ? "Voir le résultat final" : "Question suivante"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}