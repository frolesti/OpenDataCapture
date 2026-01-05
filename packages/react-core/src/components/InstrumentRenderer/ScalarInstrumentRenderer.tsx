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
  /** @deprecated */
  onCompileError?: (error: Error) => void;
  onSubmit: InstrumentSubmitHandler;
  /** @deprecated */
  options?: InterpretOptions;
  subject?: SubjectDisplayInfo;
  target: Pick<ScalarInstrumentBundleContainer, 'bundle' | 'id'>;
};

const fixDates = (data: unknown): unknown => {
  if (data instanceof Date) {
    // Construct a UTC date using the local components of the input date
    // We set time to 12:00 UTC to be safe against timezone shifts
    return new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0));
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
  onCompileError,
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
                ca: "S'ha produït un error inesperat en carregar aquest instrument. Si us plau, contacteu amb l'administrador de la plataforma per obtenir més assistència.",
                es: 'Se produjo un error inesperado al cargar este instrumento. Por favor, contacte con el administrador de la plataforma para obtener más asistencia.'
              })}
              title={t({
                ca: "Error en carregar l'instrument",
                es: 'Error al cargar el instrumento'
              })}
            />
          );
        })
        .with({ status: 'DONE' }, ({ instrument }) =>
          match({ index, instrument })
            .with({ index: 0 }, () => <InstrumentOverview instrument={instrument} onNext={() => setIndex(1)} />)
            .with({ index: 1, instrument: { kind: 'FORM' } }, ({ instrument }) => (
              <FormContent instrument={instrument} onSubmit={handleSubmit} />
            ))
            .with({ index: 1, instrument: { kind: 'INTERACTIVE' } }, () => (
              <InteractiveContent bundle={target.bundle} onSubmit={handleSubmit} />
            ))
            .with({ index: 2 }, () => (
              <InstrumentSummary data={data} instrument={instrument} subject={subject} timeCollected={Date.now()} />
            ))
            .otherwise(() => null)
        )
        .exhaustive()}
    </InstrumentRendererContainer>
  );
};
