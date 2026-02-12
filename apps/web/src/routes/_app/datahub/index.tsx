import React, { useState } from 'react';

import { camelToSnakeCase, toBasicISOString } from '@douglasneuroinformatics/libjs';
import {
  ActionDropdown,
  Button,
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
import { Edit } from 'lucide-react';
import { unparse } from 'papaparse';

import { IdentificationForm } from '@/components/IdentificationForm';
import { PageHeader } from '@/components/PageHeader';
import { SelectInstrument } from '@/components/SelectInstrument';
import { useGlobalInstrumentVisualization } from '@/hooks/useGlobalInstrumentVisualization';
import { useSubjectsQuery } from '@/hooks/useSubjectsQuery';
import { useAppStore } from '@/store';
import { downloadExcel } from '@/utils/excel';

const DialogTrigger = Dialog.Trigger as unknown as React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
const DialogTitle = Dialog.Title as unknown as React.ComponentType<React.PropsWithChildren<unknown>>;

const SelectTrigger = Select.Trigger as unknown as React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
const SelectContent = Select.Content as unknown as React.ComponentType<React.PropsWithChildren<unknown>>;
const SelectItem = Select.Item as unknown as React.ComponentType<React.PropsWithChildren<{ value: string }>>;

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
    instrument,
    instrumentId,
    instrumentOptions,
    records,
    setFilter,
    setInstrumentId,
    setMinDate
  } = useGlobalInstrumentVisualization();
  const { data: subjects } = useSubjectsQuery({ params: { groupId: currentGroup?.id } });

  const isStandardUser = currentUser?.basePermissionLevel === 'STANDARD';

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
        en: 'Exportant entrades, si us plau, espereu...',
        fr: 'Exportando entradas, por favor espere...'
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
            <DialogTrigger className="grow">
              <SearchBar
                className="[&>input]:text-foreground [&>input]:placeholder-foreground"
                data-testid="datahub-subject-lookup-search"
                id="subject-lookup-search-bar"
                placeholder={t({
                  en: 'Feu clic per cercar',
                  fr: 'Haga clic para buscar'
                })}
                readOnly={true}
              />
            </DialogTrigger>
            <Dialog.Content data-spotlight-type="subject-lookup-modal" data-testid="datahub-subject-lookup-dialog">
              <Dialog.Header>
                <DialogTitle>{t('datahub.index.lookup.title')}</DialogTitle>
              </Dialog.Header>
              <IdentificationForm onSubmit={(data) => void lookupSubject(data)} />
            </Dialog.Content>
          </Dialog>
          <React.Fragment>
            <div className="min-w-60">
              <SelectInstrument options={instrumentOptions} onSelect={setInstrumentId} />
            </div>
            <div className="flex min-w-60 gap-2 lg:shrink">
              {instrumentId ? (
                <React.Fragment>
                  {Object.entries(filterOptions).map(([key, options]) => {
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
                        en: 'Centre Sanitari',
                        fr: 'Centro Sanitario'
                      }).toUpperCase();
                    }

                    return (
                      <Select
                        key={key}
                        value={filters[key] ?? 'ALL'}
                        onValueChange={(val) => setFilter(key, val === 'ALL' ? null : val)}
                      >
                        <SelectTrigger className="min-w-32">
                          <Select.Value placeholder={label} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">
                            {key === '__subjectId__'
                              ? t('datahub.filters.allSubjects')
                              : isHealthCenter
                                ? t('datahub.filters.allHealthCenters')
                                : `${t('datahub.filters.all')} ${key}`}
                          </SelectItem>
                          {Array.from(options).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {key === '__subjectId__' ? removeSubjectIdScope(opt) : opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })}
                  <ActionDropdown
                    widthFull
                    data-spotlight-type="export-data-dropdown"
                    disabled={!instrumentId}
                    options={['CSV', 'Excel']}
                    title={t('core.download')}
                    triggerClassName="min-w-32"
                    onSelection={dl}
                  />
                </React.Fragment>
              ) : (
                !isStandardUser && (
                  <ActionDropdown
                    widthFull
                    data-spotlight-type="export-data-dropdown"
                    data-testid="datahub-export-dropdown"
                    options={['CSV', 'Excel']}
                    title={t('datahub.index.table.export')}
                    onSelection={handleExportSelection}
                  />
                )
              )}
            </div>
          </React.Fragment>
        </div>
        {instrumentId ? (
          <ClientTable
            noWrap
            columns={[
              {
                field: '__id__',
                // @ts-expect-error - Formatter can return a React Node
                formatter: (id: string) => {
                  const record = records.find((r) => r.__id__ === id);
                  if (!record || removeSubjectIdScope(record.__subjectId__ as string) !== currentUser?.username) {
                    return <div className="w-9" />;
                  }
                  return (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const rawData = record && typeof record === 'object' ? record.__data__ : undefined;
                        // Ensure empty objects are treated as undefined to trigger fetch in target page
                        const initialData = rawData && Object.keys(rawData).length > 0 ? rawData : undefined;

                        void navigate({
                          params: { id: instrumentId },
                          search: { recordId: id },
                          state: {
                            info: instrument,
                            initialData: initialData,
                            recordId: id
                          },
                          to: '/instruments/render/$id'
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  );
                },
                label: t({
                  en: 'Accions',
                  fr: 'Acciones'
                })
              },
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
                en: "Seleccioneu un instrument per veure'n les dades",
                fr: 'Seleccione un instrumento para ver sus datos'
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
