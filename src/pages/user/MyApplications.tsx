import { useMemo, useState } from 'react';
import {
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  SearchBox,
  TableCellLayout,
  createTableColumn,
  makeStyles,
  tokens,
  type TableColumnDefinition,
} from '@fluentui/react-components';
import {
  EyeRegular,
  ArrowSyncRegular,
  DocumentBulletListRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  DismissCircleRegular,
  AddCircleRegular,
  DocumentSearchRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useLoanData } from '../../context/LoanDataContext';
import { useCurrentUser } from '../../context/UserContext';
import type { LoanApplication, StatusKind } from '../../models/loan';
import { classifyStatus, computeDashboardMetrics, formatCurrency, formatDate } from '../../models/loan';
import { PageHeader } from '../../components/PageHeader';
import { Surface } from '../../components/Surface';
import { KpiCard } from '../../components/KpiCard';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';

// Status filter options. Each maps to a normalised StatusKind so we reuse the
// shared classifyStatus utility (Submitted/Received both fall in the "received"
// bucket, since the Dataverse model has no separate "Submitted" choice).
const STATUS_FILTERS: { key: string; label: string; kind: StatusKind | 'all' }[] = [
  { key: 'all', label: 'All', kind: 'all' },
  { key: 'submitted', label: 'Submitted', kind: 'received' },
  { key: 'received', label: 'Received', kind: 'received' },
  { key: 'review', label: 'Under Review', kind: 'review' },
  { key: 'approved', label: 'Approved', kind: 'approved' },
  { key: 'rejected', label: 'Rejected', kind: 'rejected' },
  { key: 'resubmitted', label: 'ReSubmitted', kind: 'resubmitted' },
];

// When auth is wired up, flip this on to scope the list to the signed-in user.
const FILTER_TO_SIGNED_IN_APPLICANT = false;

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
  },
  search: { minWidth: '240px', flexGrow: 1 },
  filterField: { minWidth: '180px' },
  gridCard: { padding: 0, overflow: 'hidden' },
  gridScroll: { overflowX: 'auto' },
  grid: {
    width: '100%',
    minWidth: '880px',
    '& .fui-DataGridHeaderCell': {
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForeground2,
    },
    '& .fui-DataGridBody .fui-DataGridRow:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  rowActions: { display: 'flex', gap: tokens.spacingHorizontalXS, flexWrap: 'wrap' },
});

export function MyApplications() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { records, status, error, reload } = useLoanData();
  const { user } = useCurrentUser();

  const [query, setQuery] = useState('');
  const [statusKey, setStatusKey] = useState('all');

  // Extension point: scope to the signed-in applicant once auth exists. Until
  // then (flag off), show all applications.
  const myApplications = useMemo(
    () =>
      FILTER_TO_SIGNED_IN_APPLICANT && user.email
        ? records.filter(
            (r) => (r.cr174_applicantemail ?? '').toLowerCase() === user.email.toLowerCase(),
          )
        : records,
    [records, user.email],
  );

  const metrics = useMemo(() => computeDashboardMetrics(myApplications), [myApplications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const def = STATUS_FILTERS.find((f) => f.key === statusKey) ?? STATUS_FILTERS[0];
    return myApplications.filter((r) => {
      if (def.kind !== 'all' && classifyStatus(r._cr174_status_label) !== def.kind) return false;
      if (q) {
        const haystack = `${r.cr174_referencenumber ?? ''} ${r.cr174_applicantname ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [myApplications, query, statusKey]);

  const rowId = (item: LoanApplication) =>
    item.cr174_loanapplicid ?? item.cr174_referencenumber ?? '';

  const columns: TableColumnDefinition<LoanApplication>[] = useMemo(
    () => [
      createTableColumn<LoanApplication>({
        columnId: 'reference',
        compare: (a, b) =>
          (a.cr174_referencenumber ?? '').localeCompare(b.cr174_referencenumber ?? ''),
        renderHeaderCell: () => 'Reference Number',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <span className={styles.mono}>{item.cr174_referencenumber ?? '—'}</span>
          </TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'applicant',
        compare: (a, b) => (a.cr174_applicantname ?? '').localeCompare(b.cr174_applicantname ?? ''),
        renderHeaderCell: () => 'Applicant Name',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.cr174_applicantname ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'loanType',
        compare: (a, b) =>
          (a._cr174_loantype_label ?? '').localeCompare(b._cr174_loantype_label ?? ''),
        renderHeaderCell: () => 'Loan Type',
        renderCell: (item) => (
          <TableCellLayout truncate>{item._cr174_loantype_label ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'amount',
        compare: (a, b) => (a.cr174_amount ?? 0) - (b.cr174_amount ?? 0),
        renderHeaderCell: () => 'Loan Amount',
        renderCell: (item) => <TableCellLayout>{formatCurrency(item.cr174_amount)}</TableCellLayout>,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'status',
        compare: (a, b) => (a._cr174_status_label ?? '').localeCompare(b._cr174_status_label ?? ''),
        renderHeaderCell: () => 'Status',
        renderCell: (item) => <StatusBadge label={item._cr174_status_label} />,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'created',
        compare: (a, b) =>
          new Date(a.cr174_createddate ?? 0).getTime() - new Date(b.cr174_createddate ?? 0).getTime(),
        renderHeaderCell: () => 'Created Date',
        renderCell: (item) => <TableCellLayout>{formatDate(item.cr174_createddate)}</TableCellLayout>,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'actions',
        renderHeaderCell: () => 'Actions',
        renderCell: (item) => {
          const id = rowId(item);
          const rejected = classifyStatus(item._cr174_status_label) === 'rejected';
          return (
            <TableCellLayout>
              <div className={styles.rowActions}>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<EyeRegular />}
                  onClick={() => navigate(`/user/my-applications/${encodeURIComponent(id)}`)}
                >
                  View Details
                </Button>
                {rejected && (
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowSyncRegular />}
                    onClick={() => navigate(`/user/reapply/${encodeURIComponent(id)}`)}
                  >
                    Reapply
                  </Button>
                )}
              </div>
            </TableCellLayout>
          );
        },
      }),
    ],
    // navigate/styles are stable; cells only close over them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className={styles.root}>
      <PageHeader
        title="My Applications"
        subtitle="Track the loan applications you've submitted and their current status."
      />

      {status === 'loading' && <LoadingState label="Loading your applications…" />}

      {status === 'error' && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Couldn't load your applications</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void reload()}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {status === 'ready' && (
        <>
          <section className={styles.kpiGrid} aria-label="Application summary">
            <KpiCard
              label="Total Applications"
              value={metrics.total}
              icon={<DocumentBulletListRegular />}
              tone="brand"
            />
            <KpiCard
              label="Approved"
              value={metrics.approved}
              icon={<CheckmarkCircleRegular />}
              tone="success"
            />
            <KpiCard
              label="Under Review"
              value={metrics.review}
              icon={<ClockRegular />}
              tone="warning"
            />
            <KpiCard
              label="Rejected"
              value={metrics.rejected}
              icon={<DismissCircleRegular />}
              tone="danger"
            />
          </section>

          {myApplications.length === 0 ? (
            <Surface padded={false}>
              <EmptyState
                icon={<AddCircleRegular />}
                title="No applications yet"
                message="You haven't submitted any loan applications yet. Start a new application to begin your loan journey."
                action={
                  <Button appearance="primary" onClick={() => navigate('/user/apply-loan')}>
                    Apply for a Loan
                  </Button>
                }
              />
            </Surface>
          ) : (
            <>
              <Surface className={styles.filterBar} padded>
                <Field label="Search" className={styles.search}>
                  <SearchBox
                    placeholder="Reference number or applicant name…"
                    value={query}
                    onChange={(_e, d) => setQuery(d.value)}
                  />
                </Field>
                <Field label="Status" className={styles.filterField}>
                  <Dropdown
                    value={STATUS_FILTERS.find((f) => f.key === statusKey)?.label ?? 'All'}
                    selectedOptions={[statusKey]}
                    onOptionSelect={(_e, d) => setStatusKey(d.optionValue ?? 'all')}
                  >
                    {STATUS_FILTERS.map((f) => (
                      <Option key={f.key} value={f.key} text={f.label}>
                        {f.label}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
              </Surface>

              <Surface className={styles.gridCard} padded={false}>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<DocumentSearchRegular />}
                    title="No matching applications"
                    message="No applications match your search or filter. Try a different reference number, name, or status."
                  />
                ) : (
                  <div className={styles.gridScroll}>
                    <DataGrid
                      className={styles.grid}
                      items={filtered}
                      columns={columns}
                      getRowId={rowId}
                      sortable
                      defaultSortState={{ sortColumn: 'created', sortDirection: 'descending' }}
                      focusMode="composite"
                      aria-label="My loan applications"
                    >
                      <DataGridHeader>
                        <DataGridRow>
                          {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                          )}
                        </DataGridRow>
                      </DataGridHeader>
                      <DataGridBody<LoanApplication>>
                        {({ item, rowId: id }) => (
                          <DataGridRow<LoanApplication> key={id}>
                            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>
                  </div>
                )}
              </Surface>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MyApplications;
