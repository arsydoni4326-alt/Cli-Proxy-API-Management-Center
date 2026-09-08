import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IconGithub } from '@/components/ui/icons';
import { useAuthStore } from '@/stores';
import { UPSTREAM_CHANGELOG_URL, UPSTREAM_REPOSITORY_URL } from './updateChangelog';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestVersion: string;
  latestCommit: string;
  onCheckUpdate?: () => void;
}

export function UpdateModal({
  isOpen,
  onClose,
  latestVersion,
  latestCommit,
  onCheckUpdate,
}: UpdateModalProps) {
  const { t } = useTranslation();
  const serverVersion = useAuthStore((state) => state.serverVersion);
  const [expandedChangelog, setExpandedChangelog] = useState(false);
  const availableVersion = latestVersion || t('update_modal.version_unknown');
  const availableCommit = latestCommit.slice(0, 7) || t('update_modal.version_unknown');

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
          <p>{t('update_modal.message', { version: availableVersion, commit: availableCommit })}</p>
          <p className="update-modal-current">
            {t('update_modal.current_version', {
              version: serverVersion || t('update_modal.version_unknown'),
            })}
          </p>
        </div>
        <div className="update-modal-changelog">
          <button
            type="button"
            className="update-modal-changelog-toggle"
            onClick={() => setExpandedChangelog((expanded) => !expanded)}
            aria-expanded={expandedChangelog}
            aria-controls="update-modal-changelog-content"
          >
            {expandedChangelog
              ? t('update_modal.hide_changelog')
              : t('update_modal.show_changelog')}
            <span className={`chevron ${expandedChangelog ? 'expanded' : ''}`} aria-hidden="true">
              ▼
            </span>
          </button>
          {expandedChangelog && (
            <div
              id="update-modal-changelog-content"
              className="update-modal-changelog-content"
              role="region"
              aria-label={t('update_modal.changelog_title')}
            >
              <h3>{t('update_modal.changelog_title')}</h3>
              <p>{t('update_modal.changelog_description', { version: availableVersion })}</p>
              <p className="changelog-link">
                <a href={UPSTREAM_CHANGELOG_URL} target="_blank" rel="noopener noreferrer">
                  {t('update_modal.view_changelog')}
                </a>
              </p>
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
          href={UPSTREAM_REPOSITORY_URL}
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
