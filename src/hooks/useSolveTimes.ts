import { useState, useCallback } from "react";

export interface SolveRecord {
  id: string;
  elapsed: number; // ms
  date: string;    // ISO 8601
}

const STORAGE_KEY = "cube-app:solve-times";

function load(): SolveRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(records: SolveRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useSolveTimes() {
  const [times, setTimes] = useState<SolveRecord[]>(load);

  const addTime = useCallback((elapsed: number): SolveRecord => {
    const record: SolveRecord = {
      id: crypto.randomUUID(),
      elapsed,
      date: new Date().toISOString(),
    };
    setTimes(prev => {
      const next = [...prev, record];
      save(next);
      return next;
    });
    return record;
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTimes([]);
  }, []);

  const exportCSV = useCallback((records: SolveRecord[]) => {
    const rows = ["Date,Time (s)", ...records.map(r =>
      `${r.date},${(r.elapsed / 1000).toFixed(2)}`
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solve-times-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { times, addTime, clearAll, exportCSV };
}
