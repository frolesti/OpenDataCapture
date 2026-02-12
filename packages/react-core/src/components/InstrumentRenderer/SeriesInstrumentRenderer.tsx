import { useEffect, useState } from 'react';

import { replacer } from '@douglasneuroinformatics/libjs';
import { Button, Heading, Spinner } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Json } from '@opendatacapture/runtime-core';
import type { SeriesInstrumentBundleContainer } from '@opendatacapture/schemas/instrument';
import { CircleCheckIcon } from 'lucide-react';
import { match } from 'ts-pattern';

import { useInterpretedInstrument } from '../../hooks/useInterpretedInstrument';
import { FormContent } from '../FormContent';
import { InstrumentOverview } from '../InstrumentOverview';
import { InteractiveContent } from '../InteractiveContent';
import { ContentPlaceholder } from './ContentPlaceholder';
import { InstrumentRendererContainer } from './InstrumentRendererContainer';

import type { InstrumentSubmitHandler, SubjectDisplayInfo } from '../../types';

export type SeriesInstrumentRendererProps = {
  className?: string;
  initialSeriesIndex?: number;
  isResuming?: boolean;
  onSubmit: InstrumentSubmitHandler;
  subject?: SubjectDisplayInfo;
  target: SeriesInstrumentBundleContainer;
};

export const SeriesInstrumentRenderer = ({
  className,
  initialSeriesIndex,
  isResuming,
  onSubmit,
  target
}: SeriesInstrumentRendererProps) => {
  const [index, setIndex] = useState<0 | 1 | 2>(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(() => {
    if (!initialSeriesIndex) {
      return 0;
    } else if (initialSeriesIndex >= target.items.length) {
      throw new Error(
        `Initial series index '${initialSeriesIndex}' must be less than length of items '${target.items.length}'`
      );
    }
    return initialSeriesIndex;
  });
  const { t } = useTranslation();

  const scalarBundle = target.items[currentItemIndex]?.bundle;
  const scalarId = target.items[currentItemIndex]?.id;

  const rootState = useInterpretedInstrument(target.bundle);
  const scalarState = useInterpretedInstrument(scalarBundle ?? '');

  const [isInstrumentInProgress, setIsInstrumentInProgress] = useState(false);

  const handleSubmit = async (data: unknown) => {
    await onSubmit({
      data: JSON.parse(JSON.stringify(data, replacer)) as Json,
      index,
      instrumentId: scalarId!,
      kind: 'SERIES'
    });
    setCurrentItemIndex(currentItemIndex + 1);
    setIsInstrumentInProgress(false);
  };

  useEffect(() => {
    if (currentItemIndex === target.items.length) {
      setIndex(2);
    }
  }, [currentItemIndex, target.items.length]);

  return (
    <InstrumentRendererContainer className={className} index={index}>
      {match(rootState)
        .with({ status: 'LOADING' }, () => <Spinner />)
        .with({ status: 'ERROR' }, () => (
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
        ))
        .with({ status: 'DONE' }, ({ instrument }) =>
          match({ index, instrument, isInstrumentInProgress })
            .with({ index: 0 }, () => (
              <InstrumentOverview instrument={instrument} isResuming={isResuming} onNext={() => setIndex(1)} />
            ))
            .with({ index: 1, isInstrumentInProgress: false }, () => (
              <div className="flex grow flex-col items-center justify-center space-y-1 py-32 text-center">
                <Heading variant="h4">
                  {t({
                    en: "Sèrie d'instruments en curs",
                    fr: 'Serie de instrumentos en curso'
                  })}
                </Heading>
                <p className="text-muted-foreground text-sm">
                  {t({
                    en: `Instruments completats: ${currentItemIndex}/${target.items.length}`,
                    fr: `Instrumentos completados: ${currentItemIndex}/${target.items.length}`
                  })}
                </p>
                <div className="pt-2">
                  <Button
                    disabled={isInstrumentInProgress}
                    type="button"
                    onClick={() => setIsInstrumentInProgress(true)}
                  >
                    {t({
                      en: 'Continuar',
                      fr: 'Continuar'
                    })}
                  </Button>
                </div>
              </div>
            ))
            .with({ index: 1, isInstrumentInProgress: true }, () =>
              match(scalarState)
                .with({ status: 'ERROR' }, () => (
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
                ))
                .with({ status: 'LOADING' }, () => <Spinner />)
                .with({ status: 'DONE' }, () =>
                  match(scalarState)
                    .with({ instrument: { kind: 'FORM' } }, ({ instrument }) => (
                      <FormContent instrument={instrument} onSubmit={handleSubmit} />
                    ))
                    .with({ instrument: { kind: 'INTERACTIVE' } }, () => (
                      <InteractiveContent bundle={scalarBundle!} onSubmit={handleSubmit} />
                    ))
                    .otherwise(() => null)
                )
                .otherwise(() => null)
            )
            .with({ index: 2 }, () => (
              <div className="mx-auto flex max-w-prose grow flex-col items-center justify-center space-y-1 py-32 text-center">
                <CircleCheckIcon
                  className="fill-green-600 stroke-white [&>circle]:stroke-transparent"
                  style={{ height: '36px', width: '36px' }}
                />
                <Heading variant="h3">
                  {t({
                    en: 'Gràcies!',
                    fr: '¡Gracias!'
                  })}
                </Heading>
                <p className="text-muted-foreground text-sm">
                  {t({
                    en: "Heu completat amb èxit tots els passos d'aquest instrument.",
                    fr: 'Ha completado con éxito todos los pasos de este instrumento.'
                  })}
                </p>
              </div>
            ))
            .otherwise(() => null)
        )
        .exhaustive()}
    </InstrumentRendererContainer>
  );
};
