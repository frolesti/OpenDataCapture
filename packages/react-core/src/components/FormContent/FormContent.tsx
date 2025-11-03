import { Button, Dialog, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { AnyUnilingualFormInstrument, FormInstrument } from '@opendatacapture/runtime-core';
import { InfoIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Promisable } from 'type-fest';

export type FormContentProps = {
  instrument: AnyUnilingualFormInstrument;
  onSubmit: (data: FormInstrument.Data) => Promisable<void>;
};

export const FormContent = ({ instrument, onSubmit }: FormContentProps) => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement>(null);
  const instructions = instrument.clientDetails?.instructions ?? instrument.details.instructions;

  useEffect(() => {
    // Add mutation observer to detect validation errors and scroll to first error
    const observer = new MutationObserver(() => {
      const firstError = formRef.current?.querySelector('[role="alert"], .text-destructive, [aria-invalid="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus on the input field if possible
        const inputElement = firstError.closest('[data-field]')?.querySelector('input, select, textarea');
        if (inputElement && inputElement instanceof HTMLElement) {
          setTimeout(() => inputElement.focus(), 300);
        }
      }
    });

    if (formRef.current) {
      observer.observe(formRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-invalid', 'role']
      });
    }

    return () => observer.disconnect();
  }, []);

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
      <Form
        preventResetValuesOnReset
        content={instrument.content}
        data-testid="form-content"
        initialValues={instrument.initialValues}
        validationSchema={instrument.validationSchema}
        onSubmit={(data) => void onSubmit(data)}
      />
    </div>
  );
};
