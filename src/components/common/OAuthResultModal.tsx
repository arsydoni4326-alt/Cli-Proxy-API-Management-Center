import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IconAlertTriangle, IconCheckCircle2, IconInfo } from '@/components/ui/icons';

export type OAuthResultType = 'success' | 'error' | 'warning' | 'info';

export interface OAuthResult {
  type: OAuthResultType;
  message: string;
}

interface OAuthResultModalProps {
  result: OAuthResult | null;
  onClose: () => void;
}

const TITLE_KEYS: Record<OAuthResultType, string> = {
  success: 'common.success',
  error: 'common.error',
  warning: 'common.warning',
  info: 'common.info',
};

function ResultIcon({ type }: { type: OAuthResultType }) {
  const size = 48;
  if (type === 'success') return <IconCheckCircle2 size={size} />;
  if (type === 'error' || type === 'warning') return <IconAlertTriangle size={size} />;
  return <IconInfo size={size} />;
}

/**
 * Modal presentation for OAuth process results (login, polling, callback,
 * cancellation, and credential import outcomes). Unlike toast notifications,
 * the modal stays open until the user dismisses it, so results can never be
 * missed. Dismissal is always manual: there is no auto-dismiss timer.
 */
export function OAuthResultModal({ result, onClose }: OAuthResultModalProps) {
  const { t } = useTranslation();
  // Keep the last result rendered while the closing animation plays.
  const [lastResult, setLastResult] = useState<OAuthResult | null>(null);

  useEffect(() => {
    if (result) {
      setLastResult(result);
    }
  }, [result]);

  const displayed = result ?? lastResult;

  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title={displayed ? t(TITLE_KEYS[displayed.type]) : undefined}
      width={500}
    >
      {displayed && (
        <div className={`oauth-result-modal-content oauth-result-modal-${displayed.type}`}>
          <div className="oauth-result-modal-icon" aria-hidden="true">
            <ResultIcon type={displayed.type} />
          </div>
          <div className="oauth-result-modal-message">
            <p>{displayed.message}</p>
          </div>
          <div className="oauth-result-modal-actions">
            <Button variant="primary" onClick={onClose} autoFocus>
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}