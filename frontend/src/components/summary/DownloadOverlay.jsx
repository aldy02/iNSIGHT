import { forwardRef, useImperativeHandle, useState } from 'react';
import { flushSync } from 'react-dom';
import LoadingOverlay from './LoadingOverlay';

const TEXT = {
  save: {
    title: 'Menyimpan laporan...',
    message: 'Perubahan Anda disimpan dulu sebelum PDF dibuat.',
  },
  pdf: {
    title: 'Membuat PDF...',
    message: 'Mohon tunggu, jangan tutup halaman ini. File akan terunduh otomatis.',
  },
};

const DownloadOverlay = forwardRef(function DownloadOverlay(_, ref) {
  const [step, setStep] = useState(null);

  useImperativeHandle(ref, () => ({
    // flushSync: Show directly, only this small component will render
    show: (s) => flushSync(() => setStep(s)),
    hide: () => setStep(null),
  }));

  return (
    <LoadingOverlay
      isOpen={!!step}
      title={TEXT[step]?.title}
      message={TEXT[step]?.message}
    />
  );
});

export default DownloadOverlay;