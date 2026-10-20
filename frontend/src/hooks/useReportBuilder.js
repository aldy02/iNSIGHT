import { useCallback, useMemo, useState } from 'react';
import { buildIndex, buildSectionsFromItems, buildPayloadItems, keyOf } from '../utils/summary';

const NO_SECTIONS = [];

export default function useReportBuilder(categories) {
    const [sections, setSections] = useState(NO_SECTIONS);
    const [summaries, setSummaries] = useState({});
    const [dirty, setDirty] = useState(false);

    const index = useMemo(() => buildIndex(categories), [categories]);

    const update = (fn) => {
        setSections(fn);
        setDirty(true);
    };

    //   Arrange report (create category)
    const addCategory = (catId) =>
        update((r) =>
            r.some((s) => s.catId === catId)
                ? r
                : [...r, { catId, items: [] }].sort((a, b) => index.catRank[a.catId] - index.catRank[b.catId])
        );

    const removeCategory = (catId) => update((r) => r.filter((s) => s.catId !== catId));

    // Add unit with selected parameter
    const addUnit = (catId, unitId, paramIds = []) =>
        update((r) =>
            r.map((s) => {
                if (s.catId !== catId || s.items.some((i) => i.unitId === unitId)) return s;
                const wanted = new Set(paramIds);
                const order = index.unitInfo[unitId].unit.parameters.map((p) => p.id);
                return {
                    ...s,
                    items: [...s.items, { unitId, params: order.filter((id) => wanted.has(id)) }].sort(
                        (a, b) => index.unitRank[a.unitId] - index.unitRank[b.unitId]
                    ),
                };
            })
        );

    const removeUnit = (catId, unitId) =>
        update((r) =>
            r.map((s) => (s.catId === catId ? { ...s, items: s.items.filter((i) => i.unitId !== unitId) } : s))
        );

    const addParams = (catId, unitId, paramIds) =>
        update((r) =>
            r.map((s) =>
                s.catId !== catId
                    ? s
                    : {
                        ...s,
                        items: s.items.map((i) => {
                            if (i.unitId !== unitId) return i;
                            const wanted = new Set([...i.params, ...paramIds]);
                            const order = index.unitInfo[unitId].unit.parameters.map((p) => p.id);
                            return { ...i, params: order.filter((id) => wanted.has(id)) };
                        }),
                    }
            )
        );

    const removeParam = (catId, unitId, paramId) =>
        update((r) =>
            r.map((s) =>
                s.catId !== catId
                    ? s
                    : {
                        ...s,
                        items: s.items.map((i) =>
                            i.unitId === unitId ? { ...i, params: i.params.filter((id) => id !== paramId) } : i
                        ),
                    }
            )
        );

    const clearReport = () => update(() => NO_SECTIONS);

    const changeSummary = (pkey, text) => {
        setSummaries((prev) => ({ ...prev, [pkey]: text }));
        setDirty(true);
    };

    // Sync to server
    // Get saved report data
    const loadReport = useCallback(
        (items) => {
            const next = {};
            items.forEach((it) => {
                if (it.summary) next[keyOf(String(it.unitId), String(it.parameterId))] = it.summary;
            });
            setSections(buildSectionsFromItems(items, index));
            setSummaries(next);
            setDirty(false);
        },
        [index]
    );

    const reset = useCallback(() => {
        setSections(NO_SECTIONS);
        setSummaries({});
        setDirty(false);
    }, []);

    const markSaved = useCallback(() => setDirty(false), []);

    const toPayloadItems = () => buildPayloadItems(sections, summaries);

    // Report value
    const reportKeys = sections.flatMap((s) =>
        s.items.flatMap((i) => i.params.map((pid) => keyOf(i.unitId, pid)))
    );
    const selectedCount = reportKeys.length;
    const filledCount = reportKeys.filter((k) => (summaries[k] || '').trim()).length;

    return {
        sections,
        summaries,
        index,
        dirty,
        selectedCount,
        filledCount,
        addCategory,
        removeCategory,
        addUnit,
        removeUnit,
        addParams,
        removeParam,
        clearReport,
        changeSummary,
        loadReport,
        reset,
        markSaved,
        toPayloadItems,
    };
}