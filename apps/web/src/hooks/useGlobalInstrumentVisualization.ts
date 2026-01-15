import { useEffect, useMemo, useState } from 'react';

import { toBasicISOString } from '@douglasneuroinformatics/libjs';
import { useDownload, useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualScalarInstrument, InstrumentKind } from '@opendatacapture/runtime-core';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { omit } from 'lodash-es';
import { unparse } from 'papaparse';

import { useInstrument } from '@/hooks/useInstrument';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';
import { downloadSubjectTableExcel } from '@/utils/excel';

const CENTROS_SANITARIOS = [
  'CAP Badia (Barcelona)',
  'CAP Numància (Barcelona)',
  'CAP Sant Martí (Barcelona)',
  'CAP Manso (Barcelona)',
  'CS Alhama de Granada (Granada)',
  'CS Aguadulce Sur (Almería)',
  'CS Maria Fuensanta Pérez Quirós (Sevilla)',
  'CS Brújula (Madrid)',
  'CS Juncal (Torrejón de Ardoz)',
  'CS Ensanche (Vallecas)',
  'Cons Alovera (Guadalajara)',
  'CS Gandhi (Madrid)',
  'CS Aravaca (Madrid)',
  'Cons Fontaras (Valencia)',
  'CS Vinarós (Castellón)',
  'Cons Almenara Playa (Sagunto)',
  'CS Arturo Eiryes (Valladolid)',
  'CS Antonio Gutierrez (León)',
  'CS Tortola (Valladolid)',
  'CS José Aguado (León)',
  'CS Ávila Norte (Ávila)',
  'CS Vitoria (Salamanca)',
  'CS Alfonso Sánchez Montero (Salamanca)',
  'CS Xunqueira de Ambia (Orense)',
  'CS Casco Vello (Pontevedra)',
  'CS Elviña (A Coruña)',
  'CS Culleredo (A Coruña)',
  'CS Montealto La Torre (A Coruña)',
  'CS Marín (Pontevedra)'
];

type InstrumentVisualizationRecord = {
  [key: string]: unknown;
  __date__: Date;
  __subjectId__: string;
  __time__: number;
};

type UseGlobalInstrumentVisualizationOptions = {
  params?: {
    kind?: InstrumentKind;
  };
};

export function useGlobalInstrumentVisualization({ params }: UseGlobalInstrumentVisualizationOptions = {}) {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentUser = useAppStore((store) => store.currentUser);

  const download = useDownload();
  const notifications = useNotificationsStore();
  const { t } = useTranslation('common');

  const [records, setRecords] = useState<InstrumentVisualizationRecord[]>([]);
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [instrumentId, setInstrumentId] = useState<null | string>(null);
  const [filters, setFilters] = useState<{ [key: string]: null | string }>({});

  const instrument = useInstrument(instrumentId) as AnyUnilingualScalarInstrument;

  const instrumentInfoQuery = useInstrumentInfoQuery({
    params: { kind: params?.kind }
  });

  const recordsQuery = useInstrumentRecords({
    enabled: instrumentId !== null,
    params: {
      groupId: currentGroup?.id,
      instrumentId: instrumentId!,
      kind: params?.kind,
      minDate: minDate ?? undefined
    }
  });

  const filterOptions = useMemo(() => {
    const options: { [key: string]: Set<string> } = {};
    if (records.length === 0) return options;

    const allKeys = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });

    const keys = Array.from(allKeys).filter((k) => {
      if (k === '__subjectId__') {
        return true;
      }

      // Explicitly allow only the specific column requested, case-insensitive and accent-insensitive
      const normalizedKey = k
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (
        normalizedKey === 'CENTRO_ATENCION_PRIMARIA' ||
        normalizedKey === 'CENTRO_SANITARIO' ||
        (normalizedKey.includes('CENTRO') && normalizedKey.includes('PRIMARIA'))
      ) {
        return true;
      }

      return false;
    });

    keys.forEach((key) => {
      options[key] = new Set();

      // Explicitly allow only the specific column requested, case-insensitive and accent-insensitive
      const normalizedKey = key
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (
        normalizedKey === 'CENTRO_ATENCION_PRIMARIA' ||
        normalizedKey === 'CENTRO_SANITARIO' ||
        (normalizedKey.includes('CENTRO') && normalizedKey.includes('PRIMARIA'))
      ) {
        CENTROS_SANITARIOS.forEach((center) => options[key]?.add(center));
      }
    });

    records.forEach((record) => {
      keys.forEach((key) => {
        const val = record[key];
        if (typeof val === 'string') {
          options[key]?.add(val);
        }
      });
    });

    return options;
  }, [records]);

  const filteredRecords = useMemo(() => {
    let currentRecords = records;
    if (currentUser?.basePermissionLevel === 'STANDARD') {
      currentRecords = currentRecords.filter((record) => {
        return removeSubjectIdScope(record.__subjectId__) === currentUser.username;
      });
    }

    return currentRecords.filter((record) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return record[key] === value;
      });
    });
  }, [records, filters]);

  const dl = (option: 'CSV' | 'CSV Long' | 'Excel' | 'Excel Long' | 'JSON' | 'TSV' | 'TSV Long') => {
    if (!instrument) {
      notifications.addNotification({ message: t('errors.noInstrumentSelected'), type: 'error' });
      return;
    } else if (filteredRecords.length === 0) {
      notifications.addNotification({ message: t('errors.noDataToExport'), type: 'error' });
      return;
    }

    const baseFilename = `${currentUser!.username}_${instrument.internal.name}_${
      instrument.internal.edition
    }_${new Date().toISOString()}`;

    const exportRecords = filteredRecords.map((record) => omit(record, ['__time__']));

    const makeWideRows = () => {
      const columnNames = Object.keys(exportRecords[0]!);
      return exportRecords.map((item) => {
        const obj: { [key: string]: any } = {
          GroupID: currentGroup ? currentGroup.id : 'root',
          subjectId: item.__subjectId__
        };
        for (const key of columnNames) {
          if (key === '__subjectId__') continue;
          const val = item[key];
          if (key === '__date__') {
            obj.Date = toBasicISOString(val as Date);
            continue;
          }
          obj[key] = typeof val === 'object' ? JSON.stringify(val) : val;
        }
        return obj;
      });
    };

    const makeLongRows = () => {
      const longRecord: { [key: string]: any }[] = [];

      exportRecords.forEach((item) => {
        let date: Date;
        let subjectId: string;

        Object.entries(item).forEach(([objKey, objVal]) => {
          if (objKey === '__date__') {
            date = objVal as Date;
            return;
          }
          if (objKey === '__subjectId__') {
            subjectId = objVal as string;
            return;
          }

          if (Array.isArray(objVal)) {
            objVal.forEach((arrayItem) => {
              Object.entries(arrayItem as object).forEach(([arrKey, arrItem]) => {
                longRecord.push({
                  GroupID: currentGroup ? currentGroup.id : 'root',
                  // eslint-disable-next-line perfectionist/sort-objects
                  Date: toBasicISOString(date),
                  SubjectID: subjectId,
                  Variable: `${objKey}-${arrKey}`,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, perfectionist/sort-objects
                  Value: arrItem
                });
              });
            });
          } else {
            longRecord.push({
              GroupID: currentGroup ? currentGroup.id : 'root',
              // eslint-disable-next-line perfectionist/sort-objects
              Date: toBasicISOString(date),
              SubjectID: subjectId,
              Value: objVal,
              Variable: objKey
            });
          }
        });
      });

      return longRecord;
    };

    const parseHelper = (rows: unknown[], delimiter: string) => {
      return unparse(rows, {
        delimiter: delimiter,
        escapeChar: '"',
        header: true,
        quoteChar: '"',
        quotes: false,
        skipEmptyLines: true
      });
    };

    switch (option) {
      case 'CSV':
        void download(`${baseFilename}.csv`, () => {
          const rows = makeWideRows();
          const csv = parseHelper(rows, ',');

          return csv;
        });
        break;
      case 'CSV Long': {
        void download(`${baseFilename}.csv`, () => {
          const rows = makeLongRows();
          const csv = parseHelper(rows, ',');
          return csv;
        });
        break;
      }
      case 'Excel': {
        const rows = makeWideRows();
        // Note: downloadSubjectTableExcel might expect specific format, but we are passing rows.
        // The original code passed removeSubjectIdScope(params.subjectId) as sheet name or similar.
        // Here we don't have a single subjectId. We can use instrument name.
        downloadSubjectTableExcel(`${baseFilename}.xlsx`, rows, instrument.internal.name);
        break;
      }
      case 'Excel Long': {
        const rows = makeLongRows();
        downloadSubjectTableExcel(`${baseFilename}.xlsx`, rows, instrument.internal.name);
        break;
      }
      case 'JSON': {
        // exportRecords already has subjectID if we map it?
        // In original code: item.subjectID = params.subjectId;
        // Here we have __subjectId__.
        const jsonRecords = exportRecords.map((r) => ({
          ...omit(r, ['__subjectId__']),
          subjectID: r.__subjectId__
        }));
        void download(`${baseFilename}.json`, () => Promise.resolve(JSON.stringify(jsonRecords, null, 2)));
        break;
      }
      case 'TSV':
        void download(`${baseFilename}.tsv`, () => {
          const rows = makeWideRows();
          const tsv = parseHelper(rows, '\t');

          return tsv;
        });
        break;
      case 'TSV Long':
        void download(`${baseFilename}.tsv`, () => {
          const rows = makeLongRows();
          const tsv = parseHelper(rows, '\t');

          return tsv;
        });
        break;
    }
  };

  useEffect(() => {
    if (recordsQuery.data) {
      const records: InstrumentVisualizationRecord[] = [];
      for (const record of recordsQuery.data) {
        const props = record.data && typeof record.data === 'object' ? record.data : {};
        records.push({
          __date__: record.date,
          __subjectId__: record.subjectId,
          __time__: record.date.getTime(),
          ...record.computedMeasures,
          ...props
        });
      }
      setRecords(records);
    }
  }, [recordsQuery.data]);

  const instrumentOptions: { [key: string]: string } = useMemo(() => {
    const options: { [key: string]: string } = {};
    for (const instrument of instrumentInfoQuery.data ?? []) {
      options[instrument.id] = instrument.details.title;
    }
    return options;
  }, [instrumentInfoQuery.data]);

  return {
    dl,
    filterOptions,
    filters,
    instrument,
    instrumentId,
    instrumentOptions,
    minDate,
    records: filteredRecords,
    setFilter: (key: string, value: null | string) => setFilters((prev) => ({ ...prev, [key]: value })),
    setInstrumentId,
    setMinDate
  };
}

export type { InstrumentVisualizationRecord };
