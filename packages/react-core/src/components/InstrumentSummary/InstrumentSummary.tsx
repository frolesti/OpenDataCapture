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
    const filename = `${instrument.internal.name}_${instrument.internal.edition}_${new Date(timeCollected).toISOString()}.csv`;
    const csvContent = [
      ['Variable', 'Value'],
      ...Object.values(computedMeasures).map(({ label, value }) => [label, value?.toString() ?? 'NA'])
    ]
      .map((row) => row.map((cell) => `"${cell?.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    void download(filename, () => `\uFEFF${csvContent}`);
  };

  /*
  let language: string;
  if (instrument.language === 'ca') {
    language = t({
      ca: 'Català'
    } as any);
  } else {
    language = instrument.language;
  }
  */

  const copyText = Object.values(computedMeasures)
    .map(({ label, value }) => `${label}\t${value?.toString() ?? 'NA'}`)
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
                  en: `Resum de Resultats per ${title}`,
                  fr: `Resumen de Resultados para ${title}`
                })
              : t({
                  en: 'Resum de Resultats',
                  fr: 'Resumen de Resultados'
                })}
          </Heading>
          <p className="text-muted-foreground text-sm">
            {t({
              en: `Completat el ${dateCompleted}`,
              fr: `Completado el ${dateCompleted}`
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
                    value: data?.codigoPaciente ?? subject.id
                  },
                  {
                    label: t({
                      en: 'Nom Complet',
                      fr: 'Nombre Completo'
                    }),
                    value:
                      subject?.firstName && subject.lastName
                        ? `${subject.firstName} ${subject.lastName}`
                        : t({
                            en: 'Anònim',
                            fr: 'Anónimo'
                          })
                  },
                  {
                    label: t({
                      en: 'Data de Naixement',
                      fr: 'Fecha de Nacimiento'
                    }),
                    value: subject.dateOfBirth ? toBasicISOString(subject.dateOfBirth) : null
                  },
                  {
                    label: t({
                      en: 'Sexe al Naixement',
                      fr: 'Sexo al Nacer'
                    }),
                    value:
                      subject.sex === 'MALE'
                        ? t({
                            en: 'Masculí',
                            fr: 'Masculino'
                          })
                        : subject.sex === 'FEMALE'
                          ? t({
                              en: 'Femení',
                              fr: 'Femenino'
                            })
                          : null
                  }
                ]
              : [
                  {
                    label: 'ID',
                    value: data?.codigoPaciente ?? removeSubjectIdScope(subject.id)
                  }
                ]
          }
          title={t({
            en: 'Subjecte',
            fr: 'Sujeto'
          })}
        />
      )}
      <InstrumentSummaryGroup
        items={[
          {
            label: t({
              en: 'Títol',
              fr: 'Título'
            }),
            value: title
          },
          {
            label: t({
              en: 'Edició',
              fr: 'Edición'
            }),
            value: instrument.internal.edition
          }
        ]}
        title={t({
          en: 'Instrument',
          fr: 'Instrumento'
        })}
      />
      {results.length > 0 && (
        <InstrumentSummaryGroup
          items={results}
          title={t({
            en: 'Resultats',
            fr: 'Resultados'
          })}
        />
      )}
    </div>
  );
};
