import { useCallback, useEffect, useMemo, useState } from "react";

export interface TrainerTimeRecord {
  id: string;
  caseId: string;
  elapsed: number;
  date: string;
}

const STORAGE_KEY = "cube-app:trainer-times";

function load(): TrainerTimeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(records: TrainerTimeRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useTrainerTimes(caseId: string) {
  const [records, setRecords] = useState<TrainerTimeRecord[]>([]);

  useEffect(() => {
    setRecords(load());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecords(load());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addTime = useCallback((nextCaseId: string, elapsed: number): TrainerTimeRecord => {
    const record: TrainerTimeRecord = {
      id: crypto.randomUUID(),
      caseId: nextCaseId,
      elapsed,
      date: new Date().toISOString(),
    };

    setRecords((prev) => {
      const next = [...prev, record];
      save(next);
      return next;
    });

    return record;
  }, []);

  const caseRecords = useMemo(
    () => records.filter((record) => record.caseId === caseId),
    [records, caseId],
  );

  return {
    records: caseRecords,
    addTime,
  };
}
