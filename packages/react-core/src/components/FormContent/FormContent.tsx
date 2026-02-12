import { Button, Dialog, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualFormInstrument, FormInstrument } from '@opendatacapture/runtime-core';
import { InfoIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Promisable } from 'type-fest';

export type FormContentProps = {
  initialValues?: Record<string, unknown>;
  instrument: AnyUnilingualFormInstrument;
  onSubmit: (data: FormInstrument.Data) => Promisable<void>;
};

export const FormContent = ({ initialValues, instrument, onSubmit }: FormContentProps) => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const hasScrolledRef = useRef(false);
  const instructions = instrument.clientDetails?.instructions ?? instrument.details.instructions;

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
        <Heading variant="h4">{instrument.clientDetails?.title ?? instrument.details.title}</Heading>
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
        <Form
          preventResetValuesOnReset
          content={instrument.content}
          data-testid="form-content"
          initialValues={initialValues ?? instrument.initialValues}
          validationSchema={instrument.validationSchema}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};
