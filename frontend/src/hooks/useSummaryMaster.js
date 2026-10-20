import { useEffect, useState } from 'react';
import { getPlants, getSummaryStructure } from '../api/reports';
import { errorMessage } from '../utils/summary';

const NO_CATEGORIES = [];

export default function useSummaryMaster(plantId) {
    //   Plant list
    const [plants, setPlants] = useState([]);
    const [plantsLoading, setPlantsLoading] = useState(true);
    const [plantsError, setPlantsError] = useState('');
    const [plantsTick, setPlantsTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setPlantsLoading(true);
        setPlantsError('');
        getPlants()
            .then((data) => {
                if (!cancelled) setPlants(data);
            })
            .catch((err) => {
                if (!cancelled) setPlantsError(errorMessage(err, 'Gagal memuat daftar pabrik.'));
            })
            .finally(() => {
                if (!cancelled) setPlantsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [plantsTick]);

    //   Stucture master selected plant
    const [structure, setStructure] = useState({ plantId: null, categories: NO_CATEGORIES });
    const [structureError, setStructureError] = useState('');
    const [structureTick, setStructureTick] = useState(0);

    useEffect(() => {
        if (plantId == null) return undefined;
        let cancelled = false;
        setStructureError('');
        getSummaryStructure(plantId)
            .then((categories) => {
                if (!cancelled) setStructure({ plantId, categories });
            })
            .catch((err) => {
                if (!cancelled) setStructureError(errorMessage(err, 'Gagal memuat data master pabrik.'));
            });
        return () => {
            cancelled = true;
        };
    }, [plantId, structureTick]);

    const structureReady = plantId != null && structure.plantId === plantId;

    return {
        plants,
        plantsLoading,
        plantsError,
        reloadPlants: () => setPlantsTick((t) => t + 1),
        categories: structureReady ? structure.categories : NO_CATEGORIES,
        structureReady,
        structureLoading: plantId != null && !structureReady && !structureError,
        structureError,
        reloadStructure: () => setStructureTick((t) => t + 1),
    };
}