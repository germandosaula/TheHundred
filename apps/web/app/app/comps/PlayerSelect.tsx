"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AssignableCompPlayerEntry } from "../../lib";

interface PlayerSelectProps {
  disabled?: boolean;
  onChange: (player: { playerUserId?: string; playerName: string }) => void;
  players: AssignableCompPlayerEntry[];
  playerName: string;
  playerUserId?: string;
}

export function PlayerSelect({
  disabled = false,
  onChange,
  players,
  playerName,
  playerUserId
}: PlayerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.userId === playerUserId) ?? null,
    [playerUserId, players]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return players;
    }

    return players.filter((player) => {
      const haystack = `${player.displayName} ${player.discordId} ${player.status}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [players, query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const label = selectedPlayer?.displayName ?? (playerName || "Buscar en el roster");

  return (
    <div className={`player-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        className="player-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="player-select-value">
          <strong>{label}</strong>
        </span>
      </button>
      {open ? (
        <div className="player-select-menu">
          <input
            autoFocus
            className="player-select-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en el roster"
            value={query}
          />
          <div className="player-select-options" role="listbox">
            <button
              className={`player-select-option clear ${!selectedPlayer && !playerName ? "active" : ""}`}
              onClick={() => {
                onChange({ playerUserId: undefined, playerName: "" });
                setOpen(false);
                setQuery("");
              }}
              type="button"
            >
              <span>Sin asignar</span>
            </button>
            {filteredPlayers.map((player) => (
              <button
                className={`player-select-option ${player.userId === playerUserId ? "active" : ""}`}
                key={player.userId}
                onClick={() => {
                  onChange({ playerUserId: player.userId, playerName: player.displayName });
                  setOpen(false);
                  setQuery("");
                }}
                type="button"
              >
                <span className="player-select-option-copy">
                  <strong>{player.displayName}</strong>
                </span>
              </button>
            ))}
            {filteredPlayers.length === 0 ? (
              <div className="player-select-empty">No hay miembros sincronizados que coincidan con la busqueda.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
