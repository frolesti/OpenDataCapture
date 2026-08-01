import { useMemo, useState } from 'react';

import { Button, Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { GroupHospitalManager } from '@/components/admin/groups/GroupHospitalManager';
import { getHospitalsFromGroups } from '@/components/admin/groups/hospitals';
import { PageHeader } from '@/components/PageHeader';
import { useCreateGroupMutation } from '@/hooks/useCreateGroupMutation';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';

type CreateGroupFormData = {
  name: string;
};

const RouteComponent = () => {
  const [hospitals, setHospitals] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');

  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const navigate = useNavigate();
  const createGroupMutation = useCreateGroupMutation();

  const knownHospitals = useMemo(() => getHospitalsFromGroups(groupsQuery.data ?? []), [groupsQuery.data]);

  const canSubmit = nameValue.trim().length > 0;

  const handleSubmit = async (data: CreateGroupFormData) => {
    await createGroupMutation.mutateAsync({
      data: {
        hospitals,
        name: data.name,
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
            }
          }}
          customStyles={{ submitBtn: 'hidden' }}
          fieldsFooter={
            <GroupHospitalManager
              hospitals={hospitals}
              knownHospitals={knownHospitals}
              onHospitalsChange={setHospitals}
            />
          }
          initialValues={{
            name: ''
          }}
          subscribe={{
            onChange: (values) => setNameValue((values as { name?: string }).name ?? ''),
            selector: (values) => (values as { name?: string }).name ?? ''
          }}
          validationSchema={z.object({
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
