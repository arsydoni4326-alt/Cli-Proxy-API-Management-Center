import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IconGithub } from '@/components/ui/icons';
import { useAuthStore } from '@/stores';
import { changelogContent } from './updateChangelog';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestVersion: string;
  latestCommit: string;
  onCheckUpdate?: () => void;
}

export function UpdateModal({ isOpen, onClose, latestVersion, latestCommit, onCheckUpdate }: UpdateModalProps) {
  const { t } = useTranslation();
  const serverVersion = useAuthStore((state) => state.serverVersion);
  const [expandedChangelog, setExpandedChangelog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('update_modal.title')}
      width={500}
      closeDisabled={false}
    >
      <div className="update-modal-content">
        <div className="update-modal-icon">
          <IconGithub size={48} />
        </div>
        <div className="update-modal-message">
          <p>{t('update_modal.message', { version: latestVersion, commit: latestCommit.slice(0, 7) })}</p>
          <p className="update-modal-current">
            {t('update_modal.current_version', { version: serverVersion || 'Unknown' })}
          </p>
        </div>
        <div className="update-modal-changelog">
          <button
            type="button"
            className="update-modal-changelog-toggle"
            onClick={() => setExpandedChangelog(!expandedChangelog)}
          >
            {t('update_modal.show_changelog')}
            <span className={`chevron ${expandedChangelog ? 'expanded' : ''}`}>▼</span>
          </button>
          {expandedChangelog && (
            <div className="update-modal-changelog-content">
              {changelogContent(latestVersion)}
            </div>
          )}
        </div>
        <div className="update-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            {t('update_modal.dismiss')}
          </Button>
          {onCheckUpdate && (
            <Button variant="primary" onClick={onCheckUpdate}>
              {t('update_modal.check_again')}
            </Button>
          )}
        </div>
        <a
          href="https://github.com/arsydoni4326-alt/CLIProxyAPI"
          target="_blank"
          rel="noopener noreferrer"
          className="update-modal-link"
        >
          {t('update_modal.view_repo')}
          <IconGithub size={16} />
        </a>
      </div>
    </Modal>
  );
}
