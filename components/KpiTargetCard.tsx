"use client";
import { useMemo } from "react";

interface KpiTargetCardProps {
  label: string;
  actualValue: number;
  targetValue: number;
  formattedActual: string;
  formattedTarget: string;
  lowerIsBetter?: boolean;
  isEditing?: boolean;
  onTargetChange?: (newTarget: number) => void;
  step?: number;
}

export default function KpiTargetCard({
  label,
  actualValue,
  targetValue,
  formattedActual,
  formattedTarget,
  lowerIsBetter = false,
  isEditing = false,
  onTargetChange,
  step = 1,
}: KpiTargetCardProps) {
  const { pctAchieved, isMet, statusLabel, strokeColor, badgeClass } = useMemo(() => {
    const safeTarget = Math.max(0.0001, targetValue);
    const safeActual = Math.max(0.0001, actualValue);

    const rawRatio = lowerIsBetter ? safeTarget / safeActual : actualValue / safeTarget;
    const pctVal = Math.round(rawRatio * 100);
    const met = lowerIsBetter ? actualValue <= targetValue : actualValue >= targetValue;

    if (met) {
      return {
        pctAchieved: pctVal,
        isMet: true,
        statusLabel: "Tercapai",
        strokeColor: "#10b981", // Emerald-500
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    }
    if (pctVal >= 85) {
      return {
        pctAchieved: pctVal,
        isMet: false,
        statusLabel: "Mendekati",
        strokeColor: "#f59e0b", // Amber-500
        badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
      };
    }
    return {
      pctAchieved: pctVal,
      isMet: false,
      statusLabel: "Di Bawah Target",
      strokeColor: "#f43f5e", // Rose-500
      badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  }, [actualValue, targetValue, lowerIsBetter]);

  // Kalkulasi geometri SVG Donut Ring
  const size = 76;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, pctAchieved));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}>
          {isMet ? "✓ " : ""}
          {statusLabel}
        </span>
      </div>

      <div className="my-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-slate-900">{formattedActual}</p>
          <p className="mt-1 text-xs text-slate-500">
            Target: <span className="font-semibold text-slate-700">{formattedTarget}</span>
          </p>
        </div>

        {/* SVG Donut Ring Chart (100% langsung tampil tanpa delay) */}
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Lingkaran latar abu-abu */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {/* Lingkaran progres pencapaian */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-800">{pctAchieved}%</span>
        </div>
      </div>

      {isEditing && onTargetChange && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <label className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Ubah Target:</span>
            <input
              type="number"
              step={step}
              value={targetValue}
              onChange={(e) => onTargetChange(Number(e.target.value))}
              className="w-24 rounded border border-slate-300 px-2 py-0.5 text-right text-xs font-medium text-slate-800"
            />
          </label>
        </div>
      )}
    </div>
  );
}