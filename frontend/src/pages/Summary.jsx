import { useState, useMemo, useEffect } from 'react';
import useReportBuilder from '../hooks/useReportBuilder';
import useSummaryMaster from '../hooks/useSummaryMaster';
import { getReport, saveReport } from '../api/reports';
import { ymd, fmtDmy, errorMessage } from '../utils/summary';
import SummaryHeader from '../components/summary/SummaryHeader';
import FilterCard from '../components/summary/FilterCard';
import ReportPreview from '../components/summary/ReportPreview';
import { ErrorNotice } from '../components/summary/FormControls';
import UnsavedChangesModal from '../components/summary/UnsavedChangesModal';
import NavigationGuard from '../components/summary/NavigationGuard';
import { pdf } from '@react-pdf/renderer';
import ReportPdf from '../components/summary/pdf/ReportPdf';
import { buildPdfReport } from '../utils/buildPdfReport';

export default function Summary() {
  const [plantId, setPlantId] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => ymd(new Date()));

  const master = useSummaryMaster(plantId);
  const { plants, categories, structureReady } = master;
  const builder = useReportBuilder(categories);
  const { dirty, loadReport, reset, markSaved } = builder;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [pending, setPending] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const plant = plants.find((p) => p.id === plantId);

  useEffect(() => {
    if (plantId == null && plants.length > 0) setPlantId(plants[0].id);
  }, [plantId, plants]);

  // Periode
  const rangeError = !!startDate && !!endDate && startDate > endDate;
  const hasPeriod = !!startDate && !!endDate && startDate <= endDate;
  const periodLabel = hasPeriod ? `periode ${fmtDmy(startDate)} \u2013 ${fmtDmy(endDate)}` : '';

  // Load saved report
  useEffect(() => {
    if (!hasPeriod || !structureReady) return undefined;
    let cancelled = false;

    setLoading(true);
    setLoadError('');
    setSaveError('');

    getReport({ plantId, start: startDate, end: endDate })
      .then((data) => {
        if (cancelled) return;
        loadReport(data?.items ?? []);
        setSavedAt(data?.updatedAt ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        reset();
        setSavedAt(null);
        setLoadError(errorMessage(err, 'Gagal memuat laporan tersimpan.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasPeriod, structureReady, plantId, startDate, endDate, reloadTick, loadReport, reset]);

  // Alert change not saved yet
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // If there is changes and not saved modal popup show
  const guardDiscard = (run) => {
    if (dirty) setPending({ run });
    else run();
  };
  const confirmPending = () => {
    const run = pending?.run;
    setPending(null);
    run?.();
  };

  const handlePlantChange = (id) =>
    guardDiscard(() => {
      reset();
      setPlantId(id);
    });
  const handleStartChange = (value) => guardDiscard(() => setStartDate(value));
  const handleEndChange = (value) => guardDiscard(() => setEndDate(value));

  // Save and download
  const handleSave = async () => {
    if (!hasPeriod) return false;
    setSaving(true);
    setSaveError('');
    try {
      const res = await saveReport({
        plantId,
        period: { start: startDate, end: endDate },
        items: builder.toPayloadItems(),
      });
      markSaved();
      setSavedAt(res.data?.updatedAt ?? new Date().toISOString());
      return true;
    } catch (err) {
      setSaveError(errorMessage(err, 'Gagal menyimpan laporan.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (dirty && !(await handleSave())) return;

    setDownloading(true);
    setSaveError('');
    try {
      const report = await buildPdfReport({
        builder,
        plantName: plant?.nama ?? '',
        periodLabel,
        startDate,
        endDate,
      });
      const blob = await pdf(<ReportPdf report={report} />).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan-${plant?.nama}-${startDate}_${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(errorMessage(err, 'Gagal membuat PDF.'));
    } finally {
      setDownloading(false);
    }
  };

  const idle = hasPeriod && structureReady && !loading && !saving && !downloading && !loadError;
  const canSave = idle && dirty;
  const canDownload = idle && builder.selectedCount > 0;
  const previewLoading = master.plantsLoading || master.structureLoading || loading;

  return (
    <div>
      <SummaryHeader
        selectedCount={builder.selectedCount}
        filledCount={builder.filledCount}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        canSave={canSave}
        canDownload={canDownload}
        onSave={handleSave}
        onDownload={handleDownload}
      />

      <div className="space-y-6">
        <FilterCard
          plants={plants}
          plantId={plantId ?? ''}
          startDate={startDate}
          endDate={endDate}
          rangeError={rangeError}
          onPlantChange={handlePlantChange}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
        />

        <ErrorNotice message={master.plantsError} onRetry={master.reloadPlants} />
        <ErrorNotice message={master.structureError} onRetry={master.reloadStructure} />
        <ErrorNotice message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        <ErrorNotice message={saveError} />

        <ReportPreview
          plantName={plant?.nama ?? '...'}
          periodLabel={periodLabel}
          startDate={hasPeriod ? startDate : ''}
          endDate={hasPeriod ? endDate : ''}
          categories={categories}
          builder={builder}
          loading={previewLoading}
        />
      </div>

      <UnsavedChangesModal isOpen={!!pending} onCancel={() => setPending(null)} onConfirm={confirmPending} />
      <NavigationGuard when={dirty} />
    </div>
  );
}