import { useContext } from 'react';
import { useBlocker, UNSAFE_DataRouterContext } from 'react-router-dom';
import UnsavedChangesModal from './UnsavedChangesModal';

// Hold page move if user click sidebar menu, back button or etc and not saved changes yet
function BlockerModal({ when }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesModal
      isOpen={blocker.state === 'blocked'}
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
    />
  );
}

export default function NavigationGuard({ when }) {
  const inDataRouter = useContext(UNSAFE_DataRouterContext) != null;
  return inDataRouter ? <BlockerModal when={when} /> : null;
}