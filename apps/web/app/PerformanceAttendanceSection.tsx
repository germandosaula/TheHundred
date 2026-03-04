"use client";

import { useState, useTransition } from "react";
import { PerformanceAttendanceChart } from "./PerformanceAttendanceChart";
import type { PublicPerformanceData } from "./lib";

type AttendanceSectionData = Pick<PublicPerformanceData, "selectedMonth" | "selectedMonthLabel" | "pagination"> & {
  attendance: PublicPerformanceData["attendance"];
};

export function PerformanceAttendanceSection({
  initialData
}: {
  initialData: AttendanceSectionData;
}) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function navigateToMonth(month?: string) {
    if (!month) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/performance?month=${encodeURIComponent(month)}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PublicPerformanceData;
      setData({
        selectedMonth: payload.selectedMonth,
        selectedMonthLabel: payload.selectedMonthLabel,
        pagination: payload.pagination,
        attendance: payload.attendance
      });
    });
  }

  return (
    <PerformanceAttendanceChart
      history={data.attendance.history}
      isPending={isPending}
      onNavigate={navigateToMonth}
      pagination={data.pagination}
      selectedMonthLabel={data.selectedMonthLabel}
    />
  );
}
