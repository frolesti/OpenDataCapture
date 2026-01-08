import { replacer, toBasicISOString } from '@douglasneuroinformatics/libjs';
import { Button, Heading, Separator } from '@douglasneuroinformatics/libui/components';
import { useDownload, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { computeInstrumentMeasures } from '@opendatacapture/instrument-utils';
import { CopyButton } from '@opendatacapture/react-core';
import type { AnyUnilingualInstrument } from '@opendatacapture/runtime-core';
import { isSubjectWithPersonalInfo, removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { filter } from 'lodash-es';
import { DownloadIcon, FileTextIcon, PrinterIcon } from 'lucide-react';

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
      ...Object.values(computedMeasures).map(({ label, value }) => [label, value?.toString() ?? 'NA'])
    ]
      .map((row) => row.map((cell) => `"${cell?.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    void download(filename, () => `\uFEFF${csvContent}`);
  };

  const handleDownloadPDF = async () => {
    // Download the CRF PDF file for osteoporosis instrument
    if (instrument.internal.name === 'osteoporosis') {
      try {
        const response = await fetch('/instruments/production-documents/CRF Osteoporosis 010925-versió final.pdf');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CRF Osteoporosis 010925-versió final.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading PDF:', error);
      }
    }
  };

  const handlePrint = () => {
    // Create a printable version of the results in table format
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const resultsHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title} - Resultats</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #000;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .metadata {
              margin-bottom: 20px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .section-title {
              font-weight: bold;
              font-size: 18px;
              margin-top: 30px;
              margin-bottom: 10px;
              border-bottom: 2px solid #333;
              padding-bottom: 5px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="metadata">
            <p>Completat el ${dateCompleted}</p>
            ${data?.codigoPaciente ? `<p><strong>ID Pacient:</strong> ${data.codigoPaciente}</p>` : ''}
          </div>
          
          <div class="section-title">Resultats</div>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(computedMeasures)
                .map(
                  ({ label, value }) => `
                <tr>
                  <td>${label}</td>
                  <td>${value?.toString() ?? 'NA'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(resultsHTML);
    printWindow.document.close();
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
          {instrument.internal.name === 'osteoporosis' && (
            <Button size="icon" title="Descarregar CRF PDF" type="button" variant="ghost" onClick={handleDownloadPDF}>
              <FileTextIcon />
            </Button>
          )}
          <Button
            size="icon"
            title="Descarregar resultats (CSV)"
            type="button"
            variant="ghost"
            onClick={handleDownloadCSV}
          >
            <DownloadIcon />
          </Button>
          <Button size="icon" title="Imprimir resultats" type="button" variant="ghost" onClick={handlePrint}>
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
