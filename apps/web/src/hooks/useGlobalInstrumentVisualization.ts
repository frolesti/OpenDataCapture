import { useEffect, useMemo, useRef, useState } from 'react';

import { toBasicISOString } from '@douglasneuroinformatics/libjs';
import { useDownload, useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { InstrumentRecordQueryParams } from '@opendatacapture/schemas/instrument-records';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { omit } from 'lodash-es';
import { unparse } from 'papaparse';

import { useInstrument } from '@/hooks/useInstrument';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';
import { downloadSubjectTableExcel } from '@/utils/excel';

type InstrumentVisualizationRecord = {
  [key: string]: unknown;
  __data__: Record<string, unknown>;
  __date__: Date;
  __id__: string;
  __instrumentId__: string;
  __subjectId__: string;
  __time__: number;
};

type UseGlobalInstrumentVisualizationOptions = {
  params?: {
    kind?: InstrumentRecordQueryParams['kind'];
  };
};

const ORION_SELECTION_INTERNAL_NAME = 'ORION_PR_2026_SELECTION';
const ORION_FOLLOWUP_INTERNAL_NAME = 'ORION_PR_2026_FOLLOWUP';
const ORION_UNIFIED_OPTION_ID = '__ORION_PR_2026__';
const ORION_EQ5D_LABELS: Record<string, Record<string, string>> = {
  eq5d_activities: {
    '1': 'No tengo problemas para realizar mis actividades cotidianas',
    '2': 'Tengo problemas leves para realizar mis actividades cotidianas',
    '3': 'Tengo problemas moderados para realizar mis actividades cotidianas',
    '4': 'Tengo problemas graves para realizar mis actividades cotidianas',
    '5': 'No puedo realizar mis actividades cotidianas'
  },
  eq5d_anxiety: {
    '1': 'No estoy ansioso ni deprimido',
    '2': 'Estoy levemente ansioso o deprimido',
    '3': 'Estoy moderadamente ansioso o deprimido',
    '4': 'Estoy muy ansioso o deprimido',
    '5': 'Estoy extremadamente ansioso o deprimido'
  },
  eq5d_mobility: {
    '1': 'No tengo problemas para caminar',
    '2': 'Tengo problemas leves para caminar',
    '3': 'Tengo problemas moderados para caminar',
    '4': 'Tengo problemas graves para caminar',
    '5': 'No puedo caminar'
  },
  eq5d_pain: {
    '1': 'No tengo dolor ni malestar',
    '2': 'Tengo dolor o malestar leve',
    '3': 'Tengo dolor o malestar moderado',
    '4': 'Tengo dolor o malestar fuerte',
    '5': 'Tengo dolor o malestar extremo'
  },
  eq5d_selfcare: {
    '1': 'No tengo problemas para lavarme o vestirme',
    '2': 'Tengo problemas leves para lavarme o vestirme',
    '3': 'Tengo problemas moderados para lavarme o vestirme',
    '4': 'Tengo problemas graves para lavarme o vestirme',
    '5': 'No puedo lavarme o vestirme'
  }
};
const ORION_FREQUENCY_LABELS: Record<string, string> = {
  '1': 'Nunca',
  '2': 'Pocas veces',
  '3': 'Algunas veces',
  '4': 'Con frecuencia',
  '5': 'Siempre'
};
const ORION_SLEEP_QUALITY_LABELS: Record<string, string> = {
  '1': 'Muy buena',
  '2': 'Buena',
  '3': 'Regular',
  '4': 'Mala',
  '5': 'Muy mala'
};
const ORION_CGI_LABELS: Record<string, string> = {
  '1': 'No evaluado',
  '2': 'Mucho mejor',
  '3': 'Bastante mejor',
  '4': 'Ligeramente mejor',
  '5': 'Sin cambios',
  '6': 'Ligeramente peor',
  '7': 'Bastante peor',
  '8': 'Mucho peor'
};

function formatOrionScaleValue(fieldName: string, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const baseFieldName = fieldName.replace(/^followup_/, '').replace(/^(retro|prosp)_/, '');
  const labels =
    ORION_EQ5D_LABELS[baseFieldName] ??
    (['sleep_onset', 'sleep_maintenance', 'sleep_daytime'].includes(baseFieldName)
      ? ORION_FREQUENCY_LABELS
      : baseFieldName === 'sleep_quality'
        ? ORION_SLEEP_QUALITY_LABELS
        : baseFieldName === 'cgi_improvement'
          ? ORION_CGI_LABELS
          : undefined);
  const label = labels?.[value];
  return label ? `${value} - ${label}` : value;
}

function getOrionPatientCode(data: Record<string, unknown>) {
  const patientCode = data.patient_code ?? data.user_code;
  return typeof patientCode === 'string' && patientCode.trim().length > 0 ? patientCode.trim() : undefined;
}

function hasMeaningfulValue(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

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
  const hasRestoredDatahubInstrument = useRef(false);
  const datahubInstrumentKey =
    currentUser && currentGroup ? `datahub:last-instrument:${currentUser.id}:${currentGroup.id}` : null;

  const instrumentInfoQuery = useInstrumentInfoQuery({
    params: { kind: params?.kind }
  });

  // Multiple editions of the same ORION instrument coexist in production (each publish
  // creates a new instrument document with its own id). Records stay attached to the
  // edition they were created with, so the unified view must match ALL of them.
  const orionSelectionInstruments = useMemo(
    () =>
      (instrumentInfoQuery.data ?? []).filter(
        (instrument) => instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME
      ),
    [instrumentInfoQuery.data]
  );
  const orionFollowupInstruments = useMemo(
    () =>
      (instrumentInfoQuery.data ?? []).filter(
        (instrument) => instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME
      ),
    [instrumentInfoQuery.data]
  );
  const pickLatestEdition = (instruments: typeof orionSelectionInstruments) =>
    [...instruments].sort((a, b) => Number(b.internal?.edition ?? 0) - Number(a.internal?.edition ?? 0))[0];
  const orionSelectionInstrument = useMemo(
    () => pickLatestEdition(orionSelectionInstruments),
    [orionSelectionInstruments]
  );
  const orionFollowupInstrument = useMemo(
    () => pickLatestEdition(orionFollowupInstruments),
    [orionFollowupInstruments]
  );
  const orionInstrumentIds = useMemo(
    () => new Set([...orionSelectionInstruments, ...orionFollowupInstruments].map((instrument) => instrument.id)),
    [orionFollowupInstruments, orionSelectionInstruments]
  );
  const isUnifiedOrionSelected = instrumentId === ORION_UNIFIED_OPTION_ID;

  const availableInstrumentIds = useMemo(
    () => new Set((instrumentInfoQuery.data ?? []).map((availableInstrument) => availableInstrument.id)),
    [instrumentInfoQuery.data]
  );

  useEffect(() => {
    if (hasRestoredDatahubInstrument.current || !datahubInstrumentKey || instrumentInfoQuery.isLoading) {
      return;
    }
    hasRestoredDatahubInstrument.current = true;
    try {
      const stored = localStorage.getItem(datahubInstrumentKey);
      if (stored && (stored === ORION_UNIFIED_OPTION_ID || availableInstrumentIds.has(stored))) {
        setInstrumentId(stored);
      }
    } catch {
      // Browser storage is optional for the datahub workflow.
    }
  }, [availableInstrumentIds, datahubInstrumentKey, instrumentInfoQuery.isLoading]);

  useEffect(() => {
    if (!datahubInstrumentKey || !hasRestoredDatahubInstrument.current) {
      return;
    }
    try {
      if (instrumentId) {
        localStorage.setItem(datahubInstrumentKey, instrumentId);
      } else {
        localStorage.removeItem(datahubInstrumentKey);
      }
    } catch {
      // Browser storage is optional for the datahub workflow.
    }
  }, [datahubInstrumentKey, instrumentId]);

  const hasOrionInOptions = useMemo(
    () =>
      (orionSelectionInstrument?.id && availableInstrumentIds.has(orionSelectionInstrument.id)) ||
      (orionFollowupInstrument?.id && availableInstrumentIds.has(orionFollowupInstrument.id)),
    [availableInstrumentIds, orionFollowupInstrument?.id, orionSelectionInstrument?.id]
  );

  useEffect(() => {
    if (instrumentInfoQuery.isLoading || instrumentId === null) {
      return;
    }
    if (instrumentId === ORION_UNIFIED_OPTION_ID) {
      if (!hasOrionInOptions) {
        setInstrumentId(null);
      }
      return;
    }
    if (orionInstrumentIds.has(instrumentId) && hasOrionInOptions) {
      setInstrumentId(ORION_UNIFIED_OPTION_ID);
      return;
    }
    if (!availableInstrumentIds.has(instrumentId)) {
      setInstrumentId(null);
    }
  }, [availableInstrumentIds, hasOrionInOptions, instrumentId, instrumentInfoQuery.isLoading, orionInstrumentIds]);

  const selectedInstrumentId =
    instrumentId === ORION_UNIFIED_OPTION_ID
      ? ORION_UNIFIED_OPTION_ID
      : instrumentId && availableInstrumentIds.has(instrumentId)
        ? instrumentId
        : null;

  const instrument = useInstrument(
    isUnifiedOrionSelected
      ? (orionSelectionInstrument?.id ?? orionFollowupInstrument?.id ?? null)
      : selectedInstrumentId
  );

  const recordsQuery = useInstrumentRecords({
    enabled: selectedInstrumentId !== null,
    params: {
      groupId: isUnifiedOrionSelected ? undefined : currentGroup?.id,
      instrumentId: isUnifiedOrionSelected ? undefined : (selectedInstrumentId ?? undefined),
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
        (currentGroup?.hospitals ?? []).forEach((center) => options[key]?.add(center));
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
  }, [currentGroup?.hospitals, records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
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

    const instrumentName = instrument.internal?.name ?? 'instrument';
    const instrumentEdition = instrument.internal?.edition ?? 'unknown';
    const baseFilename = `${currentUser!.username}_${instrumentName}_${instrumentEdition}_${new Date().toISOString()}`;

    const exportRecords = filteredRecords.map((record) => omit(record, ['__time__', '__id__', '__data__']));

    const makeWideRows = () => {
      const columnNames = Object.keys(exportRecords[0]!);
      return exportRecords.map((item) => {
        const obj: { [key: string]: any } = {
          subjectId: removeSubjectIdScope(item.__subjectId__ as string),
          Date: ''
        };

        // Add patientID first if it exists
        if (item.patientID !== undefined) {
          obj.patientID = item.patientID;
        }

        for (const key of columnNames) {
          if (key === '__subjectId__' || key === 'patientID') continue;
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
                  // eslint-disable-next-line perfectionist/sort-objects
                  Date: toBasicISOString(date),
                  SubjectID: removeSubjectIdScope(subjectId),
                  Variable: `${objKey}-${arrKey}`,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, perfectionist/sort-objects
                  Value: arrItem
                });
              });
            });
          } else {
            longRecord.push({
              // eslint-disable-next-line perfectionist/sort-objects
              Date: toBasicISOString(date),
              SubjectID: removeSubjectIdScope(subjectId),
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
        downloadSubjectTableExcel(`${baseFilename}.xlsx`, rows, instrumentName);
        break;
      }
      case 'Excel Long': {
        const rows = makeLongRows();
        downloadSubjectTableExcel(`${baseFilename}.xlsx`, rows, instrumentName);
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
      const sourceRecords = isUnifiedOrionSelected
        ? recordsQuery.data.filter((record) => {
            if (orionInstrumentIds.has(record.instrumentId)) {
              return true;
            }
            if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)) {
              return false;
            }
            const recordData = record.data as Record<string, unknown>;
            return typeof recordData.user_code === 'string' || typeof recordData.patient_code === 'string';
          })
        : recordsQuery.data;

      // Include keys from record data so historical editions remain visible even when
      // only the latest instrument definition is returned by the info endpoint.
      const allKeys = new Set<string>();
      if (instrument && instrument.kind === 'FORM') {
        if (Array.isArray(instrument.content)) {
          for (const group of instrument.content) {
            for (const key of Object.keys(group.fields)) {
              if (!key.startsWith('_warning')) {
                allKeys.add(key);
              }
            }
          }
        } else {
          for (const key of Object.keys(instrument.content)) {
            if (!key.startsWith('_warning')) {
              allKeys.add(key);
            }
          }
        }
      }
      for (const record of sourceRecords) {
        const props = record.data && typeof record.data === 'object' ? record.data : {};
        for (const key of Object.keys(props)) {
          if (!key.startsWith('_warning')) {
            allKeys.add(key);
          }
        }
        for (const key of Object.keys(record.computedMeasures ?? {})) {
          if (!key.startsWith('_warning')) {
            allKeys.add(key);
          }
        }
      }

      const expandedRecords: InstrumentVisualizationRecord[] = [];
      for (const record of sourceRecords) {
        const props = record.data && typeof record.data === 'object' ? record.data : {};
        const cleanProps = Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith('_warning')));
        if (typeof cleanProps.user_code === 'string' && cleanProps.patient_code === undefined) {
          cleanProps.patient_code = cleanProps.user_code;
          delete cleanProps.user_code;
        }
        if (isUnifiedOrionSelected) {
          for (const [key, value] of Object.entries(cleanProps)) {
            cleanProps[key] = formatOrionScaleValue(key, value);
          }
        }

        const paddedProps: { [key: string]: unknown } = {};
        allKeys.forEach((key) => {
          paddedProps[key] = undefined;
        });

        expandedRecords.push({
          __data__: record.data as Record<string, unknown>,
          __date__: record.date,
          __id__: record.id,
          __instrumentId__: record.instrumentId,
          __subjectId__: record.subjectId,
          __time__: record.date.getTime(),
          ...paddedProps,
          ...record.computedMeasures,
          ...cleanProps
        });
      }
      if (!isUnifiedOrionSelected) {
        setRecords(expandedRecords);
        return;
      }

      const mergedRecords = new Map<string, InstrumentVisualizationRecord>();
      for (const record of expandedRecords.sort((a, b) => a.__time__ - b.__time__)) {
        const patientCode = getOrionPatientCode(record.__data__) ?? getOrionPatientCode(record);
        const mergeKey = patientCode ? `${record.__subjectId__}:${patientCode}` : record.__id__;
        const existing = mergedRecords.get(mergeKey);
        if (!existing) {
          mergedRecords.set(mergeKey, { ...record, __data__: { ...record.__data__ } });
          continue;
        }

        for (const [key, value] of Object.entries(record)) {
          if (key.startsWith('__')) {
            continue;
          }
          if (!hasMeaningfulValue(value)) {
            continue;
          }
          if (!hasMeaningfulValue(existing[key])) {
            existing[key] = value;
          } else if (existing[key] !== value) {
            existing[`followup_${key}`] = value;
          }
        }

        existing.__data__ = { ...existing.__data__, ...record.__data__ };
        if (record.__time__ >= existing.__time__) {
          existing.__date__ = record.__date__;
          existing.__id__ = record.__id__;
          existing.__instrumentId__ = record.__instrumentId__;
          existing.__time__ = record.__time__;
        }
      }
      setRecords(Array.from(mergedRecords.values()));
    }
  }, [instrument, isUnifiedOrionSelected, orionInstrumentIds, recordsQuery.data]);

  const instrumentOptions: { [key: string]: string } = useMemo(() => {
    const options: { [key: string]: string } = {};
    for (const instrument of instrumentInfoQuery.data ?? []) {
      if (
        instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME ||
        instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME
      ) {
        continue;
      }
      options[instrument.id] = instrument.details.title;
    }
    if (hasOrionInOptions) {
      options[ORION_UNIFIED_OPTION_ID] = 'ORION-PR-2026';
    }
    return options;
  }, [hasOrionInOptions, instrumentInfoQuery.data]);

  return {
    dl,
    filterOptions,
    filters,
    instrument,
    instrumentId: selectedInstrumentId,
    instrumentOptions,
    minDate,
    records: filteredRecords,
    setFilter: (key: string, value: null | string) => setFilters((prev) => ({ ...prev, [key]: value })),
    setInstrumentId,
    setMinDate
  };
}

export type { InstrumentVisualizationRecord };
