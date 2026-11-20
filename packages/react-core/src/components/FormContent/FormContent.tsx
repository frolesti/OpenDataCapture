import { replacer } from '@douglasneuroinformatics/libjs';
import { Button, Dialog, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualFormInstrument, FormInstrument } from '@opendatacapture/runtime-core';
import { getTheraVisit } from '@opendatacapture/schemas/thera';
import { InfoIcon } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import type { Promisable } from 'type-fest';

export type FormContentProps = {
  initialValues?: Record<string, unknown>;
  instrument: AnyUnilingualFormInstrument;
  onDataChange?: (data: Record<string, unknown>) => void;
  onSubmit: (data: FormInstrument.Data) => Promisable<void>;
  revalidateOnChange?: boolean;
};

export const FormContent = ({
  initialValues,
  instrument,
  onDataChange,
  onSubmit,
  revalidateOnChange
}: FormContentProps) => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const hasScrolledRef = useRef(false);
  const instructions = instrument.clientDetails?.instructions ?? instrument.details?.instructions;
  const title =
    instrument.clientDetails?.title ??
    instrument.details?.title ??
    t({
      en: 'Instrument',
      fr: 'Instrumento'
    });

  const contentForForm = Array.isArray(instrument.content)
    ? instrument.content.map((group) => {
        const image = /^!\[([^\]]+)\]\((data:image\/png;base64,[A-Za-z0-9+/=]+)\)$/.exec(group.description ?? '');
        return image
          ? {
              ...group,
              description: (
                <img
                  alt={image[1]}
                  className="mx-auto my-4 h-auto max-h-96 max-w-full rounded border border-slate-200 bg-white object-contain p-3"
                  src={image[2]}
                />
              )
            }
          : group;
      })
    : instrument.content;
  const isThera = Boolean(getTheraVisit(instrument.internal.name));
  const legacyChildbirth = initialValues?.childbirth_types;
  const formInitialValues =
    isThera && instrument.internal.edition >= 9 && legacyChildbirth instanceof Set && legacyChildbirth.size === 1
      ? { ...initialValues, childbirth_types: [...legacyChildbirth][0] }
      : initialValues;

  const hasRenderableContent =
    (Array.isArray(contentForForm) && contentForForm.length > 0) ||
    (!Array.isArray(contentForForm) && Object.keys(contentForForm ?? {}).length > 0);

  const scrollToFirstError = useCallback(() => {
    if (!isSubmittingRef.current || hasScrolledRef.current) return;
    const firstError = formRef.current?.querySelector<HTMLElement>(
      '[data-testid="error-message-text"], [role="alert"], [aria-invalid="true"], [data-invalid="true"]'
    );
    if (!firstError) return;
    hasScrolledRef.current = true;
    const field = firstError.closest('[data-field-group]') ?? firstError;
    const input = field.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="radio"], [role="checkbox"]'
    );
    input?.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    isSubmittingRef.current = false;
  }, []);

  const markSubmitAttempt = () => {
    isSubmittingRef.current = true;
    hasScrolledRef.current = false;
    requestAnimationFrame(scrollToFirstError);
  };

  useEffect(() => {
    if (!formRef.current) return;

    const observer = new MutationObserver(scrollToFirstError);

    observer.observe(formRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-invalid', 'role', 'class', 'data-invalid']
    });

    return () => observer.disconnect();
  }, [scrollToFirstError]);

  const handleSubmit = async (data: FormInstrument.Data) => {
    // Reset flags on successful submit
    isSubmittingRef.current = false;
    hasScrolledRef.current = false;
    await onSubmit(data);
  };

  return (
    <div
      ref={formRef}
      className={`space-y-6 ${isThera ? '[&_[data-testid=radio-group]]:!flex-col [&_[data-testid=radio-group]]:!items-start [&_[data-testid=radio-group]]:!justify-start' : ''}`}
    >
      <div className="flex gap-2">
        <Heading variant="h4">{title}</Heading>
        <Dialog>
          <Dialog.Trigger asChild>
            <Button disabled={!instructions?.length} size="icon" variant="ghost">
              <InfoIcon />
            </Button>
          </Dialog.Trigger>
          <Dialog.Content className="sm:max-w-[425px]">
            <Dialog.Header>
              <Dialog.Title>
                {t({
                  en: 'Instructions',
                  fr: 'Instructions'
                })}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className="py-2">
              <p className="text-muted-foreground text-sm">{instructions?.join(', ')}</p>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
      </div>
      <div
        className="[&_button[type='submit']]:border-[#8f8df2] [&_button[type='submit']]:bg-[#8f8df2] [&_button[type='submit']]:text-white [&_button[type='submit']]:hover:bg-[#7f7de4]"
        onClickCapture={(e) => {
          // Detect submit button clicks to set the flag
          const target = e.target as HTMLElement;
          if (target.closest('button[type="submit"]')) {
            markSubmitAttempt();
          }
        }}
        onSubmitCapture={markSubmitAttempt}
      >
        {!hasRenderableContent ? (
          <p className="text-muted-foreground text-sm">
            {t({
              en: 'No hi ha camps disponibles per aquest instrument en el format actual.',
              fr: 'No hay campos disponibles para este instrumento en el formato actual.'
            })}
          </p>
        ) : null}
        <Form
          preventResetValuesOnReset
          content={contentForForm as any}
          data-testid="form-content"
          initialValues={{ ...instrument.initialValues, ...formInitialValues } as any}
          revalidateOnBlur={revalidateOnChange}
          subscribe={
            onDataChange
              ? {
                  onChange: (values) => {
                    onDataChange(values as Record<string, unknown>);
                  },
                  selector: (values) => JSON.stringify(values, replacer)
                }
              : undefined
          }
          validationSchema={instrument.validationSchema}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};
