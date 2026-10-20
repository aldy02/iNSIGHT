import { useEffect, useState } from 'react';
import { getReadings } from '../api/reports';
import { errorMessage } from '../utils/summary';

const NO_DATA = [];

export default function useReadings(unitId, parameterId, start, end) {
  const [state, setState] = useState({ data: NO_DATA, loading: false, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!start || !end) {
      setState({ data: NO_DATA, loading: false, error: '' });
      return undefined;
    }
    let cancelled = false;
    setState({ data: NO_DATA, loading: true, error: '' });
    getReadings({ unitId, parameterId, start, end })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: NO_DATA, loading: false, error: errorMessage(err, 'Gagal memuat data harian.') });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [unitId, parameterId, start, end, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}