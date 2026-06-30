import { useEffect, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Spinner,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  DocumentMultipleRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import { formatDate } from '../../models/loan';
import { getLoanDocuments, type LoanDocument } from '../../services/LoanDocumentsQueryService';
import { Surface } from '../Surface';
import { EmptyState } from '../EmptyState';

const useStyles = makeStyles({
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalL,
  },
  chip: {
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  loading: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  icon: { fontSize: '20px', color: tokens.colorBrandForeground1, flexShrink: 0 },
  meta: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  name: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sub: { color: tokens.colorNeutralForeground3 },
});

interface ApplicationDocumentsProps {
  referenceNumber: string;
  /** The record's `cr174_documentsuploaded` flag, used to tailor the empty state. */
  flagged?: boolean;
}

/**
 * Lists the SharePoint documents uploaded for an application (matched by the
 * `<reference>_` filename prefix) with a direct link to open each file. A
 * self-contained Surface so the details page can drop it into the column.
 */
export function ApplicationDocuments({ referenceNumber, flagged }: ApplicationDocumentsProps) {
  const styles = useStyles();
  const [docs, setDocs] = useState<LoanDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getLoanDocuments(referenceNumber).then((result) => {
      if (!active) return;
      setDocs(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [referenceNumber]);

  return (
    <Surface>
      <Subtitle2 className={styles.sectionTitle}>
        <span className={styles.chip} aria-hidden>
          <DocumentMultipleRegular />
        </span>
        Documents
      </Subtitle2>

      {loading ? (
        <div className={styles.loading}>
          <Spinner size="tiny" />
          <Caption1>Loading documents…</Caption1>
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<DocumentMultipleRegular />}
          title="No documents"
          message={
            flagged
              ? 'This application is marked as having documents, but none were found in SharePoint.'
              : 'No supporting documents were uploaded for this application.'
          }
        />
      ) : (
        <div className={styles.list}>
          {docs.map((doc) => (
            <div key={doc.id} className={styles.row}>
              <DocumentRegular className={styles.icon} aria-hidden />
              <div className={styles.meta}>
                <Body1 className={styles.name}>{doc.name}</Body1>
                {(doc.uploadedBy || doc.uploadedOn) && (
                  <Caption1 className={styles.sub}>
                    {[doc.uploadedBy, doc.uploadedOn && formatDate(doc.uploadedOn)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Caption1>
                )}
              </div>
              {doc.link && (
                <Button
                  as="a"
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  appearance="subtle"
                  icon={<OpenRegular />}
                >
                  Open
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

export default ApplicationDocuments;
