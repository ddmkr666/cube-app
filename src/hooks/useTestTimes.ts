import { useCallback, useEffect, useState } from "react";
import { SolveRecord } from "./useSolveTimes";

const STORAGE_KEY = "cube-app:test-times";

function load(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(records: SolveRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useTestTimes() {
  const [times, setTimes] = useState<SolveRecord[]>([]);

  useEffect(() => {
    setTimes(load());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTimes(load());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addTime = useCallback((elapsed: number): SolveRecord => {
    const record: SolveRecord = {
      id: crypto.randomUUID(),
      elapsed,
      date: new Date().toISOString(),
    };

    setTimes((prev) => {
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
    const rows = ["Date,Time (s)", ...records.map((r) =>
      `${r.date},${(r.elapsed / 1000).toFixed(2)}`
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-times-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { times, addTime, clearAll, exportCSV };
}
