"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName || "Joueur 1" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");
      localStorage.setItem(
        `qc:${data.code}`,
        JSON.stringify({ playerId: data.playerId, role: data.role })
      );
      router.push(`/room/${data.code}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Entre le code de la partie.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: joinName || "Joueur 2" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");
      localStorage.setItem(
        `qc:${data.code}`,
        JSON.stringify({ playerId: data.playerId, role: data.role })
      );
      router.push(`/room/${data.code}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="home-wrap">
        <div className="eyebrow-mark">&amp;</div>
        <h1 className="home-title">
          Qui connaît mieux <em>l'autre</em> ?
        </h1>
        <p className="home-sub">
          Un petit jeu à deux. Chacun répond pour soi, puis devine la réponse
          de l'autre. Un point à chaque fois que la prédiction tombe juste.
        </p>

        <div className="mode-cards">
          <div className="mode-card">
            <h3>Créer une partie</h3>
            <p>Tu obtiens un code à partager avec ton ou ta partenaire.</p>
            <label className="field-label" htmlFor="create-name">
              Ton prénom
            </label>
            <input
              id="create-name"
              className="text-input"
              placeholder="Ex. Léa"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              maxLength={24}
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              Créer et obtenir un code
            </button>
          </div>

          <div className="mode-card">
            <h3>Rejoindre une partie</h3>
            <p>Entre le code que ton ou ta partenaire t'a envoyé.</p>
            <label className="field-label" htmlFor="join-code">
              Code de la partie
            </label>
            <input
              id="join-code"
              className="text-input code-input"
              placeholder="EX. 7K2QF"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <label className="field-label" htmlFor="join-name">
              Ton prénom
            </label>
            <input
              id="join-name"
              className="text-input"
              placeholder="Ex. Sacha"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={24}
            />
            <button className="btn btn-secondary" onClick={handleJoin} disabled={loading}>
              Rejoindre la partie
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <p className="share-hint">
          Chaque partie contient 12 questions et reste disponible 24h.
          Jouez chacun depuis votre propre téléphone ou ordinateur.
        </p>
      </div>
    </div>
  );
}
