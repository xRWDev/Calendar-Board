import { useEffect, useMemo, useRef, useState } from 'react';
import type { Holiday } from '@calendar/shared';

const API_BASE = 'https://date.nager.at/api/v3';

export function useHolidays(year: number, countryCode: string) {
  const cache = useRef<Map<string, Holiday[]>>(new Map());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) return;
    const key = `${year}-${countryCode}`;
    const cached = cache.current.get(key);
    if (cached) {
      setHolidays(cached);
      setError(null);
      return;
    }

    let isActive = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/PublicHolidays/${year}/${countryCode}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load holidays');
        }
        return (await res.json()) as Holiday[];
      })
      .then((data) => {
        if (!isActive) return;
        cache.current.set(key, data);
        setHolidays(data);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err.message || 'Holidays unavailable');
        setHolidays([]);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [year, countryCode]);

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach((holiday) => {
      if (!map[holiday.date]) {
        map[holiday.date] = [];
      }
      map[holiday.date].push(holiday);
    });
    return map;
  }, [holidays]);

  return { holidays, holidayMap, loading, error };
}
