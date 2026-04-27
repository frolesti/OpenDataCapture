import { Button, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualInstrument } from '@opendatacapture/runtime-core';

export type InstrumentOverviewProps = {
  instrument: AnyUnilingualInstrument;
  isEditing?: boolean;
  isResuming?: boolean;
  onDiscardDraft?: () => void;
  onNext: () => void;
};

export const InstrumentOverview = ({
  instrument,
  onNext,
  isEditing,
  isResuming,
  onDiscardDraft
}: InstrumentOverviewProps) => {
  const { t } = useTranslation();

  const estimatedDuration = instrument.clientDetails?.estimatedDuration ?? instrument.details.estimatedDuration;
  const instructions = instrument.clientDetails?.instructions ?? instrument.details.instructions;

  return (
    <div className="space-y-6">
      <Heading variant="h4">{instrument.clientDetails?.title ?? instrument.details.title}</Heading>
      <div className="mb-8 space-y-6">
        <div>
          {estimatedDuration && (
            <>
              <Heading variant="h5">
                {t({
                  en: 'Duració estimada',
                  fr: 'Tiempo estimado'
                })}
              </Heading>
              <p className="text-muted-foreground text-sm">{`${estimatedDuration} minute(s)`}</p>
            </>
          )}
        </div>
        {Boolean(instructions?.length) && (
          <div>
            <Heading variant="h5">
              {t({
                en: 'Instruccions',
                fr: 'Instrucciones'
              })}
            </Heading>
            <p className="text-muted-foreground text-sm">{instructions!.join(', ')}</p>
          </div>
        )}
      </div>
      <Button
        className={
          isResuming
            ? 'w-full bg-sky-600 text-white hover:bg-sky-700'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 w-full'
        }
        label={t({
          en: isEditing ? 'Modificar registre' : isResuming ? 'Continuar esborrany' : 'Començar',
          fr: isEditing ? 'Modificar registro' : isResuming ? 'Continuar borrador' : 'Comenzar'
        })}
        variant="primary"
        onClick={() => {
          onNext();
        }}
      />
      {isResuming && onDiscardDraft && !isEditing && (
        <Button
          className="mt-2 w-full"
          label={t({
            en: 'Descartar esborrany',
            fr: 'Descartar borrador'
          })}
          variant="danger"
          onClick={onDiscardDraft}
        />
      )}
    </div>
  );
};
