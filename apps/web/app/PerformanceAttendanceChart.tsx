import { useState } from "react";
import type { PublicPerformanceData } from "./lib";

const CHART_WIDTH = 900;
const CHART_HEIGHT = 280;
const PADDING_LEFT = 56;
const PADDING_RIGHT = 20;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 42;
const MAX_MEMBERS = 100;

function formatDayLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}`;
}

export function PerformanceAttendanceChart({
  history,
  selectedMonthLabel,
  pagination,
  onNavigate,
  isPending,
}: {
  history: PublicPerformanceData["attendance"]["history"];
  selectedMonthLabel: string;
  pagination: PublicPerformanceData["pagination"];
  onNavigate: (month?: string) => void;
  isPending?: boolean;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    ctaLabel: string;
    attendanceLabel: string;
  } | null>(null);

  const innerWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const daySlots = Array.from({ length: 30 }, (_, index) => index + 1);
  const points = history.map((entry) => {
    const day = Number(entry.label);
    const x = PADDING_LEFT + ((day - 1) / 29) * innerWidth;
    const y =
      PADDING_TOP +
      innerHeight -
      (entry.memberCount / MAX_MEMBERS) * innerHeight;
    return { ...entry, x, y, day };
  });

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <article className="dashboard-card performance-chart-card">
      <div className="section-row">
        <div>
          <span className="card-label">Attendance Timeline</span>
          <h3>{selectedMonthLabel}</h3>
        </div>
      </div>

      <div className="performance-chart-shell">
        <svg
          className="performance-chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          {yTicks.map((tick) => {
            const y =
              PADDING_TOP + innerHeight - (tick / MAX_MEMBERS) * innerHeight;
            return (
              <g key={tick}>
                <line
                  className="performance-grid-line"
                  x1={PADDING_LEFT}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y1={y}
                  y2={y}
                />
                <text
                  className="performance-axis-label"
                  x={PADDING_LEFT - 12}
                  y={y + 4}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {points.length > 0 ? (
            <path className="performance-line" d={path} />
          ) : null}

          {points.map((point) => (
            <g key={point.dateKey}>
              <circle
                className="performance-point"
                cx={point.x}
                cy={point.y}
                onMouseEnter={() =>
                  setTooltip({
                    x: Math.min(point.x + 12, CHART_WIDTH - 180),
                    y: Math.max(point.y - 56, 18),
                    ctaLabel: `${formatDayLabel(point.dateKey)} · ${point.battleCount} battles`,
                    attendanceLabel: `${point.memberCount.toFixed(1).replace(".", ",")} (${point.attendancePercent.toFixed(1).replace(".", ",")}%)`,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
                r="4.5"
              />
            </g>
          ))}

          {tooltip ? (
            <g className="performance-tooltip" pointerEvents="none">
              <rect
                className="performance-tooltip-box"
                height="52"
                rx="10"
                width="168"
                x={tooltip.x}
                y={tooltip.y}
              />
              <text
                className="performance-tooltip-label"
                x={tooltip.x + 12}
                y={tooltip.y + 20}
              >
                {`CTA: ${tooltip.ctaLabel}`}
              </text>
              <text
                className="performance-tooltip-label"
                x={tooltip.x + 12}
                y={tooltip.y + 38}
              >
                {`Attendance: ${tooltip.attendanceLabel}`}
              </text>
            </g>
          ) : null}

          {daySlots.map((day) => {
            const x = PADDING_LEFT + ((day - 1) / 29) * innerWidth;
            return (
              <text
                className="performance-x-label"
                key={`day-${day}`}
                x={x}
                y={CHART_HEIGHT - 14}
              >
                {String(day).padStart(2, "0")}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="performance-chart-footer">
        <div className="performance-chart-meta">
          {points.length === 0 ? (
            <span className="empty">No hay datos en este mes.</span>
          ) : (
            <span className="status-badge">
              {points.length} dias con actividad
            </span>
          )}
          {isPending ? <span className="status-badge">Cargando…</span> : null}
        </div>
        <div className="actions">
          <button
            className="button ghost"
            disabled={isPending}
            onClick={() => onNavigate(pagination.previousMonth)}
            type="button"
          >
            Mes anterior
          </button>
          <button
            className="button ghost"
            disabled={isPending}
            onClick={() => onNavigate(pagination.nextMonth)}
            type="button"
          >
            Mes siguiente
          </button>
        </div>
      </div>
    </article>
  );
}
