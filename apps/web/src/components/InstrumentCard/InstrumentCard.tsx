import React from 'react';

import { Card, Heading, Tooltip } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { licenses } from '@opendatacapture/licenses';
import { InstrumentIcon } from '@opendatacapture/react-core';
import type { TranslatedInstrumentInfo } from '@opendatacapture/schemas/instrument';
import { getTheraVisit } from '@opendatacapture/schemas/thera';
import { BadgeAlertIcon, BadgeCheckIcon } from 'lucide-react';

type BaseCardItem = { label: string; tooltip?: React.ReactNode };

type LinkCardItem = BaseCardItem & { href?: null | string; kind: 'link' };

type TextCardItem = BaseCardItem & { kind: 'text'; text?: string };

type CardItem = LinkCardItem | TextCardItem;

type InstrumentCardProps = {
  instrument: TranslatedInstrumentInfo;
  isAdmin?: boolean;
  onClick: () => void;
};

export const InstrumentCard = ({ instrument, isAdmin, onClick }: InstrumentCardProps) => {
  const { t } = useTranslation();

  const license = licenses.get(instrument.details.license);
  const isOrionInstrument = instrument.internal?.name?.startsWith('ORION_') ?? false;
  const theraVisit = getTheraVisit(instrument.internal?.name ?? '');
  const theraTiming =
    theraVisit &&
    {
      V0: 'Evaluación inicial, antes de la primera visita de tratamiento.',
      V1: '1 mes desde la fecha real de la visita basal (±7 días).',
      V2: '3 meses desde la fecha real de la primera visita (±14 días).',
      V3: '6 meses desde la fecha real de la primera visita (±28 días).',
      V4: '12 meses desde la fecha real de la primera visita (±45 días).'
    }[theraVisit];
  const theraFocus =
    theraVisit &&
    {
      V0: 'Consentimiento, selección, antecedentes, cuestionarios, exploración vaginal y vulvar y seguridad.',
      V1: 'Pauta completa; síntomas, función sexual, Cervantes, exploración vaginal y vulvar y seguridad.',
      V2: 'Síntomas, función sexual, Cervantes, exploración vaginal y vulvar y seguridad.',
      V3: 'Síntomas, impresión global de mejoría (PGI-I) y seguridad.',
      V4: 'Síntomas, función sexual, Cervantes, exploración vaginal y vulvar y seguridad. Esta visita completa el estudio.'
    }[theraVisit];

  const content: CardItem[] = [
    {
      kind: 'text',
      label: t({
        en: 'Investigadors coordinadors',
        fr: 'Investigadores coordinadores'
      }),
      text: instrument.details.authors?.join(', ')
    },
    {
      kind: 'text',
      label: t({
        en: 'Descripció',
        fr: 'Descripción'
      }),
      text: instrument.details.description
    },
    ...(isOrionInstrument && !isAdmin
      ? []
      : [
          {
            kind: 'text' as const,
            label: t({
              en: 'Edició',
              fr: 'Edición'
            }),
            text: instrument.internal?.edition.toString()
          }
        ]),
    ...(isOrionInstrument
      ? [
          {
            kind: 'text' as const,
            label: t({
              en: 'Promotor',
              fr: 'Promotor'
            }),
            text: 'Laboratorios Gebro Pharma S.A.'
          }
        ]
      : [
          {
            kind: 'text' as const,
            label: t({
              en: 'Idiomes',
              fr: 'Idiomas'
            }),
            text: instrument.supportedLanguages
              .map((language) => {
                switch (language) {
                  case 'ca':
                    return 'Català';
                  case 'en':
                    return 'English';
                  case 'es':
                    return 'Español';
                  case 'fr':
                    return 'Français';
                  default:
                    return language;
                }
              })
              .join(', ')
          }
        ]),
    {
      kind: 'text',
      label: t({
        en: 'Llicència',
        fr: 'Licencia'
      }),
      text: license?.name ?? 'NA',
      tooltip: (
        <Tooltip>
          <Tooltip.Trigger className="p-0 hover:bg-transparent" size="icon" variant="ghost">
            {license?.isOpenSource ? (
              <BadgeCheckIcon className="fill-green-600 stroke-white" />
            ) : (
              <BadgeAlertIcon className="fill-red-600 stroke-white" />
            )}
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>
              {license?.isOpenSource
                ? t({
                    en: 'Aquesta és una llicència lliure i de codi obert',
                    fr: 'Esta es una licencia libre y de código abierto'
                  })
                : t({
                    en: 'Aquesta no és una llicència lliure i de codi obert',
                    fr: 'Esta no es una licencia libre y de código abierto'
                  })}
            </p>
          </Tooltip.Content>
        </Tooltip>
      )
    },
    {
      href: instrument.details.referenceUrl,
      kind: 'link',
      label: t({
        en: 'Enllaç de referència',
        fr: 'Enlace de referencia'
      })
    },
    {
      href: instrument.details.sourceUrl,
      kind: 'link',
      label: t({
        en: 'Enllaç al codi font',
        fr: 'Enlace al código fuente'
      })
    },
    ...(isOrionInstrument
      ? []
      : [
          {
            kind: 'text' as const,
            label: t({
              en: 'Etiquetes',
              fr: 'Etiquetas'
            }),
            text: instrument.tags.join(', ')
          }
        ])
  ];

  return (
    <Card
      className="group flex gap-8 p-6 transition-transform duration-300 ease-in-out hover:scale-[1.03] hover:cursor-pointer sm:p-8"
      data-testid={`instrument-card-${instrument.id}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onClick}
    >
      <div className="hidden shrink-0 items-center justify-center sm:flex md:min-w-24 lg:min-w-32">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
          <InstrumentIcon className="rounded-full" kind={instrument.kind} style={{ height: 'auto', width: '32px' }} />
        </div>
      </div>
      <div className="col-span-6 flex grow flex-col gap-2">
        <Heading variant="h4">{instrument.details.title}</Heading>
        {theraVisit && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-800 dark:bg-indigo-950">
            <p>
              <span className="font-semibold">{t({ en: 'Temporalitat: ', fr: 'Temporalidad: ' })}</span>
              {theraTiming}
            </p>
            <p>
              <span className="font-semibold">{t({ en: 'Aquesta visita: ', fr: 'Esta visita: ' })}</span>
              {theraFocus}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 text-sm tracking-tight">
          {content.map((item) => {
            if (item.kind === 'link' && !item.href) {
              return null;
            } else if (item.kind === 'text' && !item.text) {
              return null;
            }
            return (
              <div className="flex items-center gap-1" key={item.label}>
                <p className="line-clamp-3 leading-tight">
                  <span className="font-medium">{item.label + t({ en: ': ', fr: ': ' })}</span>
                  {item.kind === 'text' && <span className="text-muted-foreground">{item.text}</span>}
                  {item.kind === 'link' && (
                    <a
                      className="text-muted-foreground underline-offset-1 hover:underline"
                      href={item.href!}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {item.href}
                    </a>
                  )}
                </p>
                {item.tooltip}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
