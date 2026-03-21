"use client";

import { useMemo, useState } from "react";
import type { BottledEnergyData } from "../../lib";

interface EmbotelladasBoardProps {
  initialData: BottledEnergyData;
}

interface PreviewResult {
  rows: number;
  matchedRows: number;
  unmatchedRows: number;
  membersMatched: number;
  membersUnmatched: number;
  sampleUnmatched: string[];
}

interface ImportResult {
  importId: string;
  rows: number;
  insertedRows: number;
  duplicateRows: number;
  matchedRows: number;
  unmatchedRows: number;
}

interface PublishResult {
  sent: true;
  channelId: string;
  mentioned: number;
  messages: number;
}

interface ResetResult {
  reset: true;
  deletedLedgerRows: number;
  deletedImportRows: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmbotelladasBoard({ initialData }: EmbotelladasBoardProps) {
  const [data, setData] = useState(initialData);
  const [balanceSortDirection, setBalanceSortDirection] = useState<"asc" | "desc">("asc");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | "publish" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getBalanceClass(balance: number) {
    if (balance < 0) {
      return "balance-red";
    }
    if (balance > 0) {
      return "balance-green";
    }
    return "balance-neutral";
  }

  const sortedBalances = useMemo(() => {
    const factor = balanceSortDirection === "asc" ? 1 : -1;
    return [...data.balances].sort((left, right) => {
      if (left.balance !== right.balance) {
        return (left.balance - right.balance) * factor;
      }
      return left.displayName.localeCompare(right.displayName, "es");
    });
  }, [balanceSortDirection, data.balances]);

  async function refreshBalances() {
    const response = await fetch("/council/bottled-energy", { method: "GET" });
    const payload = (await response.json()) as BottledEnergyData & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        payload.error ?? `No se pudo recargar (${response.status})`,
      );
    }
    setData(payload);
  }

  async function handlePreview() {
    setBusy("preview");
    setError(null);
    setImportResult(null);
    setPublishResult(null);
    setResetResult(null);

    try {
      const response = await fetch("/council/bottled-energy/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const payload = (await response.json()) as PreviewResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? `No se pudo previsualizar (${response.status})`,
        );
      }
      setPreview(payload);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "No se pudo previsualizar",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    setBusy("import");
    setError(null);
    setPublishResult(null);
    setResetResult(null);

    try {
      const response = await fetch("/council/bottled-energy/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const payload = (await response.json()) as ImportResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? `No se pudo importar (${response.status})`,
        );
      }
      setImportResult(payload);
      setPreview(null);
      await refreshBalances();
      setRaw("");
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    setBusy("publish");
    setError(null);
    setPublishResult(null);
    setResetResult(null);
    try {
      const response = await fetch("/council/bottled-energy/publish", {
        method: "POST"
      });
      const payload = (await response.json()) as PublishResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `No se pudo publicar en Discord (${response.status})`);
      }
      setPublishResult(payload);
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : "No se pudo publicar en Discord"
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Esto eliminará TODOS los registros de embotelladas. ¿Confirmas reiniciar?"
    );
    if (!confirmed) {
      return;
    }

    setBusy("reset");
    setError(null);
    setPreview(null);
    setImportResult(null);
    setPublishResult(null);
    setResetResult(null);
    try {
      const response = await fetch("/council/bottled-energy/reset", {
        method: "POST"
      });
      const payload = (await response.json()) as ResetResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `No se pudo reiniciar (${response.status})`);
      }
      setResetResult(payload);
      setRaw("");
      await refreshBalances();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "No se pudo reiniciar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="embotelladas-shell">
      <section className="embotelladas-import">
        <label htmlFor="embotelladas-raw">
          Pegar registros (copiar desde Albion)
        </label>
        <textarea
          id="embotelladas-raw"
          onChange={(event) => setRaw(event.currentTarget.value)}
          placeholder={
            '"Date"\t"Player"\t"Reason"\t"Amount"\n"2026-03-08 10:20:36"\t"LaHuella"\t"Deposit"\t"10"'
          }
          rows={10}
          value={raw}
        />
        <div className="embotelladas-actions">
          <button
            className="button ghost"
            disabled={busy !== null || !raw.trim()}
            onClick={() => void handlePreview()}
            type="button"
          >
            {busy === "preview" ? "Previsualizando..." : "Previsualizar"}
          </button>
          <button
            className="button primary"
            disabled={busy !== null || !raw.trim()}
            onClick={() => void handleImport()}
            type="button"
          >
            {busy === "import" ? "Importando..." : "Importar"}
          </button>
          <button
            className="button discord-action"
            disabled={busy !== null || !data.publishConfigured}
            onClick={() => void handlePublish()}
            type="button"
          >
            {busy === "publish"
              ? "Publicando..."
              : data.publishConfigured
                ? "Publicar en Discord"
                : "Discord no configurado"}
          </button>
          <button
            className="button danger-outline"
            disabled={busy !== null}
            onClick={() => void handleReset()}
            type="button"
          >
            {busy === "reset" ? "Reiniciando..." : "Reiniciar registros"}
          </button>
        </div>
        {error ? <p className="status-text error">{error}</p> : null}
        {!data.publishConfigured ? (
          <p className="status-text">Publicación en Discord no disponible por configuración.</p>
        ) : null}
        {preview ? (
          <div className="embotelladas-summary">
            <strong>Preview</strong>
            <span>Filas: {preview.rows}</span>
            <span>Match filas: {preview.matchedRows}</span>
            <span>Sin match filas: {preview.unmatchedRows}</span>
            <span>Miembros encontrados: {preview.membersMatched}</span>
            <span>Players sin match: {preview.membersUnmatched}</span>
            {preview.sampleUnmatched.length > 0 ? (
              <span>No encontrados: {preview.sampleUnmatched.join(", ")}</span>
            ) : null}
          </div>
        ) : null}
        {importResult ? (
          <div className="embotelladas-summary success">
            <strong>Importacion completada</strong>
            <span>Import ID: {importResult.importId}</span>
            <span>Filas: {importResult.rows}</span>
            <span>Insertadas: {importResult.insertedRows}</span>
            <span>Duplicadas: {importResult.duplicateRows}</span>
            <span>Match filas: {importResult.matchedRows}</span>
            <span>Sin match filas: {importResult.unmatchedRows}</span>
          </div>
        ) : null}
        {publishResult ? (
          <div className="embotelladas-summary success">
            <strong>Mensaje publicado en Discord</strong>
            <span>Canal: {publishResult.channelId}</span>
            <span>Miembros mencionados: {publishResult.mentioned}</span>
            <span>Mensajes enviados: {publishResult.messages}</span>
          </div>
        ) : null}
        {resetResult ? (
          <div className="embotelladas-summary success">
            <strong>Registros reiniciados</strong>
            <span>Filas ledger eliminadas: {resetResult.deletedLedgerRows}</span>
            <span>Importaciones eliminadas: {resetResult.deletedImportRows}</span>
          </div>
        ) : null}
      </section>

      <section className="embotelladas-table-wrap">
        <div className="section-row compact">
          <h3>Balance por miembro</h3>
          <span className="status-text">
            Actualizado: {formatDate(data.updatedAt)}
          </span>
        </div>
        <div className="embotelladas-table">
          <div className="embotelladas-head">
            <span>Discord</span>
            <span>Albion</span>
            <button
              className="embotelladas-sort-button"
              onClick={() =>
                setBalanceSortDirection((current) => (current === "asc" ? "desc" : "asc"))
              }
              type="button"
            >
              Balance {balanceSortDirection === "asc" ? "↑" : "↓"}
            </button>
          </div>
          {sortedBalances.map((entry) => (
            <div className="embotelladas-row" key={entry.userId}>
              <span>{entry.displayName}</span>
              <span>{entry.albionName ?? "Sin albion_name"}</span>
              <strong className={getBalanceClass(entry.balance)}>{entry.balance}</strong>
            </div>
          ))}
        </div>
      </section>

      {data.unmatched.length > 0 ? (
        <section className="embotelladas-table-wrap">
          <div className="section-row compact">
            <h3>Sin match con miembros</h3>
          </div>
          <div className="embotelladas-table">
            <div className="embotelladas-head">
              <span>Player Albion</span>
              <span>Ultimo registro</span>
              <span>Balance</span>
            </div>
            {data.unmatched.map((entry) => (
              <div
                className="embotelladas-row"
                key={`${entry.albionName}-${entry.lastSeenAt}`}
              >
                <span>{entry.albionName}</span>
                <span>{formatDate(entry.lastSeenAt)}</span>
                <strong className={getBalanceClass(entry.balance)}>{entry.balance}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
