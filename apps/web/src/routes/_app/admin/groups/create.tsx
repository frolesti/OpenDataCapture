import { useMemo, useState } from 'react';

import { Button, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { DEFAULT_GROUP_HOSPITAL } from '@opendatacapture/schemas/group';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { GroupHospitalManager } from '@/components/admin/groups/GroupHospitalManager';
import { getHospitalsFromGroups } from '@/components/admin/groups/hospitals';
import { PageHeader } from '@/components/PageHeader';
import { useCreateGroupMutation } from '@/hooks/useCreateGroupMutation';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';

type CreateGroupFormData = {
  accessibleInstrumentIds: Set<string>;
  name: string;
  studyCode: 'GENERAL' | 'OR' | 'TH';
};

const RouteComponent = () => {
  const [hospitals, setHospitals] = useState<string[]>([DEFAULT_GROUP_HOSPITAL]);
  const [nameValue, setNameValue] = useState('');

  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const instrumentInfoQuery = useInstrumentInfoQuery();
  const navigate = useNavigate();
  const createGroupMutation = useCreateGroupMutation();

  const knownHospitals = useMemo(() => getHospitalsFromGroups(groupsQuery.data ?? []), [groupsQuery.data]);
  const instrumentOptions = useMemo(
    () => Object.fromEntries((instrumentInfoQuery.data ?? []).map(({ id, details }) => [id, details.title])),
    [instrumentInfoQuery.data]
  );

  const canSubmit = nameValue.trim().length > 0 && instrumentInfoQuery.isSuccess && !createGroupMutation.isPending;

  const handleSubmit = async (data: CreateGroupFormData) => {
    await createGroupMutation.mutateAsync({
      data: {
        accessibleInstrumentIds: [...data.accessibleInstrumentIds],
        hospitals,
        name: data.name,
        studyCode: data.studyCode === 'GENERAL' ? null : data.studyCode,
        type: 'CLINICAL'
      }
    });
    void navigate({ to: '..' });
  };

  return (
    <div>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t('group.create.title')}
        </Heading>
      </PageHeader>
      <div className="mx-auto max-w-3xl">
        {instrumentInfoQuery.isError && (
          <div className="mb-4" role="alert">
            <p>
              {t({ en: "No s'han pogut carregar els instruments.", fr: 'No se han podido cargar los instrumentos.' })}
            </p>
            <Button type="button" variant="outline" onClick={() => void instrumentInfoQuery.refetch()}>
              {t({ en: 'Torna-ho a provar', fr: 'Volver a intentar' })}
            </Button>
          </div>
        )}
        <Form
          additionalButtons={{
            left: (
              <Button asChild className="w-full" type="button" variant="outline">
                <Link to="..">
                  {t({
                    en: 'Torna enrere',
                    fr: 'Volver'
                  })}
                </Link>
              </Button>
            ),
            right: (
              <Button className="w-full" disabled={!canSubmit} type="submit" variant="primary">
                {t('core.submit')}
              </Button>
            )
          }}
          content={{
            name: {
              kind: 'string',
              label: t('common.groupName'),
              variant: 'input'
            },
            studyCode: {
              kind: 'string',
              label: t({ en: 'Estudi', fr: 'Estudio' }),
              options: {
                GENERAL: t({ en: 'General', fr: 'General' }),
                OR: 'ORION',
                TH: 'THERA'
              },
              variant: 'select'
            },
            accessibleInstrumentIds: {
              kind: 'set',
              label: t('group.manage.accessibleInstruments'),
              options: instrumentOptions,
              variant: 'listbox'
            }
          }}
          customStyles={{ submitBtn: 'hidden' }}
          fieldsFooter={
            <GroupHospitalManager
              hospitals={hospitals}
              knownHospitals={knownHospitals}
              onHospitalsChange={(values) =>
                setHospitals([DEFAULT_GROUP_HOSPITAL, ...values.filter((value) => value !== DEFAULT_GROUP_HOSPITAL)])
              }
            />
          }
          initialValues={{
            accessibleInstrumentIds: new Set<string>(),
            name: '',
            studyCode: 'GENERAL'
          }}
          subscribe={{
            onChange: (values) => setNameValue((values as { name?: string }).name ?? ''),
            selector: (values) => (values as { name?: string }).name ?? ''
          }}
          validationSchema={z.object({
            accessibleInstrumentIds: z.set(z.string()),
            studyCode: z.enum(['GENERAL', 'OR', 'TH']),
            name: z
              .string()
              .trim()
              .min(
                1,
                t({
                  en: 'El nom del grup és obligatori',
                  fr: 'El nombre del grupo es obligatorio'
                })
              )
          })}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/admin/groups/create')({
  component: RouteComponent
});
