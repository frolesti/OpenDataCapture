import { replacer, toBasicISOString } from '@douglasneuroinformatics/libjs';
import { Button, Heading, Separator } from '@douglasneuroinformatics/libui/components';
import { useDownload, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { computeInstrumentMeasures } from '@opendatacapture/instrument-utils';
import { CopyButton } from '@opendatacapture/react-core';
import type { AnyUnilingualInstrument } from '@opendatacapture/runtime-core';
import { isSubjectWithPersonalInfo, removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { filter } from 'lodash-es';
import { DownloadIcon, PrinterIcon } from 'lucide-react';

import { InstrumentSummaryGroup } from './InstrumentSummaryGroup';

import type { SubjectDisplayInfo } from '../../types';

export type InstrumentSummaryProps = {
  data: any;
  instrument: AnyUnilingualInstrument;
  subject?: SubjectDisplayInfo;
  timeCollected: number;
};

export const InstrumentSummary = ({ data, instrument, subject, timeCollected }: InstrumentSummaryProps) => {
  const download = useDownload();
  const { resolvedLanguage, t } = useTranslation();

  if (instrument.kind === 'SERIES') {
    return null;
  }

  const computedMeasures = filter(computeInstrumentMeasures(instrument, data), (_, key) => {
    const measure = instrument.measures?.[key];
    if (measure?.visibility === 'hidden' || measure?.hidden === true) {
      return false;
    } else if (measure?.visibility === 'visible' || measure?.visibility === false) {
      return true;
    }
    return instrument.defaultMeasureVisibility === 'visible';
  });

  const handleDownload = () => {
    const filename = `${instrument.internal.name}_${instrument.internal.edition}_${new Date(timeCollected).toISOString()}.json`;
    void download(filename, () => JSON.stringify(data, replacer, 2));
  };

  let language: string;
  if (instrument.language === 'ca') {
    language = t({
      ca: 'Català'
    } as any);
  } else {
    language = instrument.language;
  }

  const copyText = Object.values(computedMeasures)
    .map(({ label, value }) => `${label}: ${value?.toString() ?? 'NA'}`)
    .join('\n');

  const results = Object.values(computedMeasures);

  const dateCompleted = new Date().toLocaleString(resolvedLanguage, {
    dateStyle: 'long',
    timeStyle: 'long'
  });

  const title = (instrument.clientDetails?.title ?? instrument.details.title).trim();

  return (
    <div className="print:bg-primary-foreground space-y-6 print:fixed print:left-0 print:top-0 print:z-50 print:h-screen print:w-screen">
      <div className="flex">
        <div className="grow">
          <Heading variant="h4">
            {title
              ? t({
                  ca: `Resum de Resultats per ${title}`,
                  es: `Resumen de Resultados para ${title}`
                })
              : t({
                  ca: 'Resum de Resultats',
                  es: 'Resumen de Resultados'
                })}
          </Heading>
          <p className="text-muted-foreground text-sm">
            {t({
              ca: `Completat el ${dateCompleted}`,
              es: `Completado el ${dateCompleted}`
            })}
          </p>
        </div>
        <div className="hidden sm:flex sm:items-center sm:gap-1 print:hidden">
          <CopyButton text={copyText} variant="ghost" />
          <Button size="icon" type="button" variant="ghost" onClick={handleDownload}>
            <DownloadIcon />
          </Button>
          <Button size="icon" type="button" variant="ghost" onClick={print}>
            <PrinterIcon />
          </Button>
        </div>
      </div>
      <Separator />
      {subject && (
        <InstrumentSummaryGroup
          items={
            isSubjectWithPersonalInfo(subject)
              ? [
                  {
                    label: 'ID',
                    value: subject.id
                  },
                  {
                    label: t({
                      ca: 'Nom Complet',
                      es: 'Nombre Completo'
                    }),
                    value:
                      subject?.firstName && subject.lastName
                        ? `${subject.firstName} ${subject.lastName}`
                        : t({
                            ca: 'Anònim',
                            es: 'Anónimo'
                          })
                  },
                  {
                    label: t({
                      ca: 'Data de Naixement',
                      es: 'Fecha de Nacimiento'
                    }),
                    value: subject.dateOfBirth ? toBasicISOString(subject.dateOfBirth) : null
                  },
                  {
                    label: t({
                      ca: 'Sexe al Naixement',
                      es: 'Sexo al Nacer'
                    }),
                    value:
                      subject.sex === 'MALE'
                        ? t({
                            ca: 'Masculí',
                            es: 'Masculino'
                          })
                        : subject.sex === 'FEMALE'
                          ? t({
                              ca: 'Femení',
                              es: 'Femenino'
                            })
                          : null
                  }
                ]
              : [
                  {
                    label: 'ID',
                    value: removeSubjectIdScope(subject.id)
                  }
                ]
          }
          title={t({
            ca: 'Subjecte',
            es: 'Sujeto'
          })}
        />
      )}
      <InstrumentSummaryGroup
        items={[
          {
            label: t({
              ca: 'Títol',
              es: 'Título'
            }),
            value: title
          },
          {
            label: t({
              ca: 'Idioma',
              es: 'Idioma'
            }),
            value: language
          },
          {
            label: t({
              ca: 'Edició',
              es: 'Edición'
            }),
            value: instrument.internal.edition
          }
        ]}
        title={t({
          ca: 'Instrument',
          es: 'Instrumento'
        })}
      />
      {results.length > 0 && (
        <InstrumentSummaryGroup
          items={results}
          title={t({
            ca: 'Resultats',
            es: 'Resultados'
          })}
        />
      )}
    </div>
  );
};
