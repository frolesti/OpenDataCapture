import { replacer, toBasicISOString } from '@douglasneuroinformatics/libjs';
import { Button, Heading, Separator } from '@douglasneuroinformatics/libui/components';
import { useDownload, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { computeInstrumentMeasures } from '@opendatacapture/instrument-utils';
import { CopyButton } from '@opendatacapture/react-core';
import type { AnyUnilingualInstrument } from '@opendatacapture/runtime-core';
import { isSubjectWithPersonalInfo, removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { filter } from 'lodash-es';
import { DownloadIcon, FileTextIcon } from 'lucide-react';

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

  const handleDownloadCSV = () => {
    const filename = `${instrument.internal.name}_${instrument.internal.edition}_${new Date(timeCollected).toISOString()}.csv`;
    const csvContent = [
      ['Variable', 'Value'],
      ...Object.values(computedMeasures).map(({ label, value }) => [label, value?.toString() ?? 'NA']),
      ...Object.entries(data)
        .filter(([key]) => !key.startsWith('_warning'))
        .map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')])
    ]
      .map((row) => row.map((cell) => `"${cell?.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    void download(filename, () => `\uFEFF${csvContent}`);
  };

  const handleDownloadPDF = async () => {
    // Download the CRF PDF file for OMEGA osteoporosis study
    if (instrument.internal.name === 'OMEGA_FF_AP_2025') {
      try {
        const response = await fetch('/instruments/production-documents/CRD OMEGA Vdef.pdf');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CRD OMEGA Vdef.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error al descarregar el PDF. Si us plau, contacta amb el suport tècnic.');
      }
    }
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
    <div className="space-y-6">
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
          {instrument.internal.name !== 'OMEGA_FF_AP_2025' && (
            <Button
              size="icon"
              title="Descarregar resultats (CSV)"
              type="button"
              variant="ghost"
              onClick={handleDownloadCSV}
            >
              <DownloadIcon />
            </Button>
          )}
        </div>
      </div>
      <Separator />
      {subject && instrument.internal.name === 'OMEGA_FF_AP_2025' ? (
        <>
          <InstrumentSummaryGroup
            items={[
              {
                label: 'ID',
                value: removeSubjectIdScope(subject.id)
              }
            ]}
            title={t({
              en: 'Investigador',
              fr: 'Investigador'
            })}
          />
          <InstrumentSummaryGroup
            items={[
              {
                label: 'ID',
                value: data?.patientID ?? data?.codigoPaciente ?? 'N/A'
              }
            ]}
            title={t({
              en: 'Pacient',
              fr: 'Paciente'
            })}
          />
        </>
      ) : (
        subject && (
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
        )
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
      {instrument.internal.name === 'OMEGA_FF_AP_2025' && (
        <>
          <p className="text-center text-lg font-semibold text-green-700">
            Gracias por su tiempo, el formulario se ha guardado correctamente
          </p>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-blue-900">Próximos pasos:</p>
            <ul className="list-inside list-disc space-y-1 text-blue-800">
              <li>
                Para introducir datos de otro paciente, cierre el registro actual en el menú lateral haciendo clic en
                "Cierra registro actual"
              </li>
              <li>Para consultar las datos de los pacientes, acceda al "Centro de datos" en el menú lateral</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
