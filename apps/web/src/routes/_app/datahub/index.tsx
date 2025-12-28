import React, { useState } from 'react';

import { camelToSnakeCase, toBasicISOString } from '@douglasneuroinformatics/libjs';
import {
  ActionDropdown,
  ClientTable,
  Dialog,
  Heading,
  SearchBar,
  Select
} from '@douglasneuroinformatics/libui/components';
import { useDownload, useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { InstrumentRecordsExport } from '@opendatacapture/schemas/instrument-records';
import type { Subject } from '@opendatacapture/schemas/subject';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { unparse } from 'papaparse';

import { IdentificationForm } from '@/components/IdentificationForm';
import { PageHeader } from '@/components/PageHeader';
import { SelectInstrument } from '@/components/SelectInstrument';
import { useGlobalInstrumentVisualization } from '@/hooks/useGlobalInstrumentVisualization';
import { useAppStore } from '@/store';
import { downloadExcel } from '@/utils/excel';

const RouteComponent = () => {
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentUser = useAppStore((store) => store.currentUser);

  const download = useDownload();
  const addNotification = useNotificationsStore((store) => store.addNotification);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    dl,
    filterOptions,
    filters,
    instrumentId,
    instrumentOptions,
    records,
    setFilter,
    setInstrumentId,
    setMinDate
  } = useGlobalInstrumentVisualization();

  const getExportRecords = async () => {
    const response = await axios.get<InstrumentRecordsExport>('/v1/instrument-records/export', {
      params: {
        groupId: currentGroup?.id
      }
    });
    return response.data;
  };

  const handleExportSelection = (option: 'CSV' | 'Excel' | 'JSON') => {
    const baseFilename = `${currentUser!.username}_${new Date().toISOString()}`;
    addNotification({
      message: t({
        ca: 'Exportant entrades, si us plau, espereu...',
      }),
      type: 'info'
    });
    getExportRecords()
      .then((data): any => {
        switch (option) {
          case 'CSV':
            void download('README.txt', t('datahub.index.table.exportHelpText'));
            void download(`${baseFilename}.csv`, unparse(data));
            break;
          case 'Excel':
            return downloadExcel(`${baseFilename}.xlsx`, data);
          case 'JSON':
            return download(`${baseFilename}.json`, JSON.stringify(data, null, 2));
        }
      })
      .then(() => {
        addNotification({
          message: t('datahub.index.table.exportSuccess'),
          type: 'success'
        });
      })
      .catch((err) => {
        console.error(err);
        addNotification({
          message: t('datahub.index.table.exportFailed'),
          type: 'error'
        });
      });
  };

  const lookupSubject = async ({ id }: { id: string }) => {
    const response = await axios.get<Subject>(`/v1/subjects/${id}`, {
      validateStatus: (status) => status === 200 || status === 404
    });
    if (response.status === 404) {
      addNotification({ message: t('core.notFound'), type: 'warning' });
      setIsLookupOpen(false);
    } else {
      addNotification({ type: 'success' });
      await navigate({ to: `./${response.data.id}/assignments` });
    }
  };

  const fields: { field: string; label: string }[] = [];
  if (records.length > 0) {
    const allKeys = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });

    Array.from(allKeys).forEach((subItem) => {
      if (!subItem.startsWith('__')) {
        fields.push({
          field: subItem,
          label: camelToSnakeCase(subItem).toUpperCase()
        });
      }
    });
  }

  return (
    <React.Fragment>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t('datahub.index.title')}
        </Heading>
      </PageHeader>
      <div className="flex grow flex-col">
        <div className="mb-3 flex flex-col justify-between gap-3 lg:flex-row">
          <Dialog open={isLookupOpen} onOpenChange={setIsLookupOpen}>
            <Dialog.Trigger className="grow">
              <SearchBar
                className="[&>input]:text-foreground [&>input]:placeholder-foreground"
                data-testid="datahub-subject-lookup-search"
                id="subject-lookup-search-bar"
                placeholder={t({
                  ca: 'Feu clic per cercar',
                })}
                readOnly={true}
              />
            </Dialog.Trigger>
            <Dialog.Content data-spotlight-type="subject-lookup-modal" data-testid="datahub-subject-lookup-dialog">
              <Dialog.Header>
                <Dialog.Title>{t('datahub.index.lookup.title')}</Dialog.Title>
              </Dialog.Header>
              <IdentificationForm onSubmit={(data) => void lookupSubject(data)} />
            </Dialog.Content>
          </Dialog>
          <div className="min-w-60">
            <SelectInstrument options={instrumentOptions} onSelect={setInstrumentId} />
          </div>
          <div className="flex min-w-60 gap-2 lg:shrink">
            {instrumentId ? (
              <React.Fragment>
                {Object.entries(filterOptions).map(([key, options]) => {
                  if (currentUser?.basePermissionLevel === 'STANDARD') {
                    return null;
                  }
                  const normalizedKey = key.toUpperCase();
                  const isHealthCenter =
                    normalizedKey === 'CENTRO_ATENCION_PRIMARIA' ||
                    normalizedKey === 'CENTRO_SANITARIO' ||
                    (normalizedKey.includes('CENTRO') && normalizedKey.includes('PRIMARIA'));

                  let label = key;
                  if (key === '__subjectId__') {
                    label = t('datahub.index.table.subject').toUpperCase();
                  } else if (isHealthCenter) {
                    label = t({
                      ca: 'Centre Sanitari',
                    }).toUpperCase();
                  }

                  return (
                    <Select
                      key={key}
                      value={filters[key] ?? 'ALL'}
                      onValueChange={(val) => setFilter(key, val === 'ALL' ? null : val)}
                    >
                      <Select.Trigger className="min-w-32">
                        <Select.Value placeholder={label} />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="ALL">
                          {key === '__subjectId__'
                            ? t('datahub.filters.allSubjects')
                            : isHealthCenter
                              ? t('datahub.filters.allHealthCenters')
                              : `${t('datahub.filters.all')} ${key}`}
                        </Select.Item>
                        {Array.from(options).map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            {key === '__subjectId__' ? removeSubjectIdScope(opt) : opt}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  );
                })}
                <ActionDropdown
                  widthFull
                  data-spotlight-type="export-data-dropdown"
                  disabled={!instrumentId}
                  options={['TSV', 'JSON', 'CSV', 'Excel']}
                  title={t('core.download')}
                  triggerClassName="min-w-32"
                  onSelection={dl}
                />
              </React.Fragment>
            ) : (
              <ActionDropdown
                widthFull
                data-spotlight-type="export-data-dropdown"
                data-testid="datahub-export-dropdown"
                options={['CSV', 'JSON', 'Excel']}
                title={t('datahub.index.table.export')}
                onSelection={handleExportSelection}
              />
            )}
          </div>
        </div>
        {instrumentId ? (
          <ClientTable
            noWrap
            columns={[
              {
                field: '__date__',
                formatter: (value: Date) => toBasicISOString(value),
                label: 'DATE_COLLECTED'
              },
              {
                field: '__subjectId__',
                formatter: (value: string) => removeSubjectIdScope(value),
                label: 'SUBJECT_ID'
              },
              ...fields
            ]}
            data={records}
            data-testid="instrument-table"
            entriesPerPage={15}
            minRows={15}
          />
        ) : (
          <div className="flex grow flex-col items-center justify-center gap-2 text-slate-500">
            <p>
              {t({
                ca: "Seleccioneu un instrument per veure'n les dades",
              })}
            </p>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export const Route = createFileRoute('/_app/datahub/')({
  component: RouteComponent
});
