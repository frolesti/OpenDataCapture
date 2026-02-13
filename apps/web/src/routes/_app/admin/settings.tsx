import React from 'react';

import { Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { UpdateSetupStateData } from '@opendatacapture/schemas/setup';
import { createFileRoute } from '@tanstack/react-router';
import type { SetNonNullable } from 'type-fest';
import { z } from 'zod/v4';

import { PageHeader } from '@/components/PageHeader';
import { useSetupStateQuery } from '@/hooks/useSetupStateQuery';
import { useUpdateSetupStateMutation } from '@/hooks/useUpdateSetupStateMutation';

const RouteComponent = () => {
  const { t } = useTranslation();
  const setupStateQuery = useSetupStateQuery();
  const updateSetupStateMutation = useUpdateSetupStateMutation();

  const handleSubmit = (data: UpdateSetupStateData) => {
    updateSetupStateMutation.mutate(data);
  };

  return (
    <React.Fragment>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: "Modificar la configuració de l'aplicació",
            fr: 'Modificar la configuración de la aplicación'
          })}
        </Heading>
      </PageHeader>
      <Form
        className="mx-auto max-w-3xl"
        content={[
          {
            fields: {
              isExperimentalFeaturesEnabled: {
                kind: 'boolean',
                label: t('setup.enableExperimentalFeatures'),
                variant: 'radio'
              }
            },
            title: t({
              en: 'Funcionalitats',
              fr: 'Funcionalidades'
            })
          }
        ]}
        initialValues={setupStateQuery.data}
        preventResetValuesOnReset={true}
        submitBtnLabel={t('core.submit')}
        validationSchema={
          z.object({
            customLogoSvg: z.string().optional(),
            isExperimentalFeaturesEnabled: z.boolean()
          }) satisfies z.ZodType<SetNonNullable<UpdateSetupStateData>>
        }
        onSubmit={handleSubmit}
      />
    </React.Fragment>
  );
};

export const Route = createFileRoute('/_app/admin/settings')({
  component: RouteComponent
});
