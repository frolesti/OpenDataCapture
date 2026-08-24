import { useState } from 'react';

import { replacer } from '@douglasneuroinformatics/libjs';
import { Spinner } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { InterpretOptions } from '@opendatacapture/instrument-interpreter';
import type { Json } from '@opendatacapture/schemas/core';
import type { ScalarInstrumentBundleContainer } from '@opendatacapture/schemas/instrument';
import { match } from 'ts-pattern';

import { useInterpretedInstrument } from '../../hooks/useInterpretedInstrument';
import { FormContent } from '../FormContent';
import { InstrumentOverview } from '../InstrumentOverview';
import { InstrumentSummary } from '../InstrumentSummary';
import { InteractiveContent } from '../InteractiveContent';
import { ContentPlaceholder } from './ContentPlaceholder';
import { InstrumentRendererContainer } from './InstrumentRendererContainer';

import type { InstrumentSubmitHandler, SubjectDisplayInfo } from '../../types';

export type ScalarInstrumentRendererProps = {
  className?: string;
  initialData?: Record<string, unknown>;
  isEditing?: boolean;
  isResuming?: boolean;
  /** @deprecated */
  onCompileError?: (error: Error) => void;
  onDataChange?: (data: Record<string, unknown>) => void;
  onDiscardDraft?: () => void;
  onStepChange?: (step: number) => void;
  onSubmit: InstrumentSubmitHandler;
  /** @deprecated */
  options?: InterpretOptions;
  subject?: SubjectDisplayInfo;
  target: Pick<ScalarInstrumentBundleContainer, 'bundle' | 'id'>;
};

const fixDates = (data: unknown): unknown => {
  if (data instanceof Date) {
    // Date-only controls expose a UTC calendar day. Keep those components and
    // persist noon UTC so western time zones cannot shift the stored day back.
    return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 12, 0, 0));
  } else if (Array.isArray(data)) {
    return data.map(fixDates);
  } else if (data instanceof Set) {
    return new Set(Array.from(data).map(fixDates));
  } else if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fixDates(value)]));
  }
  return data;
};

export const ScalarInstrumentRenderer = ({
  className,
  initialData,
  isEditing,
  isResuming,
  onCompileError,
  onDataChange,
  onDiscardDraft,
  onStepChange,
  onSubmit,
  options,
  subject,
  target
}: ScalarInstrumentRendererProps) => {
  const [data, setData] = useState<unknown>();
  const interpreted = useInterpretedInstrument(target.bundle, options);
  const [index, setIndex] = useState<0 | 1 | 2>(0);
  const { t } = useTranslation();

  const handleSubmit = async (data: unknown) => {
    const fixedData = fixDates(data);
    await onSubmit({
      data: JSON.parse(JSON.stringify(fixedData, replacer)) as Json,
      instrumentId: target.id
    });
    setIndex(2);
    setData(fixedData);
  };

  const canFallbackToFormRenderer = (instrument: unknown): instrument is AnyUnilingualFormInstrument => {
    if (!instrument || typeof instrument !== 'object') {
      return false;
    }
    const candidate = instrument as {
      content?: unknown;
      validationSchema?: unknown;
    };
    return Boolean(candidate.content && candidate.validationSchema);
  };

  return (
    <InstrumentRendererContainer className={className} index={index}>
      {match(interpreted)
        .with({ status: 'LOADING' }, () => <Spinner />)
        .with({ status: 'ERROR' }, ({ error }) => {
          if (onCompileError) {
            onCompileError(error);
          }
          return (
            <ContentPlaceholder
              message={t({
                en: "S'ha produït un error inesperat en carregar aquest instrument. Si us plau, contacteu amb l'administrador de la plataforma per obtenir més assistència.",
                fr: 'Se produjo un error inesperado al cargar este instrumento. Por favor, contacte con el administrador de la plataforma para obtener más asistencia.'
              })}
              title={t({
                en: "Error en carregar l'instrument",
                fr: 'Error al cargar el instrumento'
              })}
            />
          );
        })
        .with({ status: 'DONE' }, ({ instrument }) =>
          match({ index, instrument })
            .with({ index: 0 }, () => (
              <InstrumentOverview
                instrument={instrument}
                isEditing={isEditing}
                isResuming={isResuming ?? Boolean(initialData)}
                onDiscardDraft={onDiscardDraft}
                onNext={() => {
                  setIndex(1);
                  onStepChange?.(1);
                }}
              />
            ))
            .with({ index: 1, instrument: { kind: 'FORM' } }, ({ instrument }) => (
              <FormContent
                key={initialData ? 'loaded' : 'new'}
                initialValues={initialData}
                instrument={instrument}
                onDataChange={onDataChange}
                onSubmit={handleSubmit}
              />
            ))
            .with({ index: 1, instrument: { kind: 'INTERACTIVE' } }, () => (
              <InteractiveContent bundle={target.bundle} onSubmit={handleSubmit} />
            ))
            .with({ index: 1 }, ({ instrument }) => {
              // Some legacy production instruments may have an incomplete runtime shape
              // (e.g., missing `kind`) but still contain valid form content.
              if (canFallbackToFormRenderer(instrument)) {
                return (
                  <FormContent
                    key={initialData ? 'loaded' : 'new'}
                    initialValues={initialData}
                    instrument={instrument}
                    onDataChange={onDataChange}
                    onSubmit={handleSubmit}
                  />
                );
              }
              return (
                <ContentPlaceholder
                  message={t({
                    en: 'Aquest instrument no té un format compatible per mostrar el contingut.',
                    fr: 'Este instrumento no tiene un formato compatible para mostrar el contenido.'
                  })}
                  title={t({
                    en: 'No es pot mostrar el contingut',
                    fr: 'No se puede mostrar el contenido'
                  })}
                />
              );
            })
            .with({ index: 2 }, () => (
              <InstrumentSummary data={data} instrument={instrument} subject={subject} timeCollected={Date.now()} />
            ))
            .otherwise(() => null)
        )
        .exhaustive()}
    </InstrumentRendererContainer>
  );
};
