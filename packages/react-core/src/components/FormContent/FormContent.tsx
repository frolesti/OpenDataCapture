import { Button, Dialog, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualFormInstrument, FormInstrument } from '@opendatacapture/runtime-core';
import { InfoIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Promisable } from 'type-fest';

export type FormContentProps = {
  initialValues?: Record<string, unknown>;
  instrument: AnyUnilingualFormInstrument;
  onDataChange?: (data: Record<string, unknown>) => void;
  onSubmit: (data: FormInstrument.Data) => Promisable<void>;
};

export const FormContent = ({ initialValues, instrument, onDataChange, onSubmit }: FormContentProps) => {
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

  const contentForForm = instrument.content;

  const hasRenderableContent =
    (Array.isArray(contentForForm) && contentForForm.length > 0) ||
    (!Array.isArray(contentForForm) && Object.keys(contentForForm ?? {}).length > 0);

  useEffect(() => {
    if (!formRef.current) return;

    const observer = new MutationObserver(() => {
      // Only scroll if we just attempted a submit and haven't scrolled yet
      if (!isSubmittingRef.current || hasScrolledRef.current) {
        return;
      }

      const firstError = formRef.current?.querySelector('[role="alert"], .text-destructive, [aria-invalid="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledRef.current = true;

        const inputElement = firstError.closest('[data-field]')?.querySelector('input, select, textarea');
        if (inputElement instanceof HTMLElement) {
          setTimeout(() => inputElement.focus(), 300);
        }

        // Reset flags after scrolling
        setTimeout(() => {
          isSubmittingRef.current = false;
        }, 500);
      }
    });

    observer.observe(formRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-invalid', 'role']
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (data: FormInstrument.Data) => {
    // Reset flags on successful submit
    isSubmittingRef.current = false;
    hasScrolledRef.current = false;
    await onSubmit(data);
  };

  return (
    <div ref={formRef} className="space-y-6">
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
        onClick={(e) => {
          // Detect submit button clicks to set the flag
          const target = e.target as HTMLElement;
          if (target.closest('button[type="submit"]')) {
            isSubmittingRef.current = true;
            hasScrolledRef.current = false;
          }
        }}
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
          initialValues={(initialValues ?? instrument.initialValues) as any}
          subscribe={
            onDataChange
              ? {
                  onChange: (values) => onDataChange(values as Record<string, unknown>),
                  selector: (values) => JSON.stringify(values)
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
