import { useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  Button,
  ClientTable,
  Form,
  Heading,
  SearchBar,
  Sheet
} from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group } from '@opendatacapture/schemas/group';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { GroupHospitalManager } from '@/components/admin/groups/GroupHospitalManager';
import { formatHospitalLabel, getHospitalsFromGroups } from '@/components/admin/groups/hospitals';
import { PageHeader } from '@/components/PageHeader';
import { useDeleteGroupMutation } from '@/hooks/useDeleteGroupMutation';
import { groupsQueryOptions, useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useSearch } from '@/hooks/useSearch';
import { useUpdateGroupByIdMutation } from '@/hooks/useUpdateGroupByIdMutation';

const arraysHaveSameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const value of b) {
    if (!setA.has(value)) return false;
  }
  return true;
};

const setsAreEqual = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
};

const RouteComponent = () => {
  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const instrumentInfoQuery = useInstrumentInfoQuery();
  const deleteGroupMutation = useDeleteGroupMutation();
  const updateGroupMutation = useUpdateGroupByIdMutation();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupHospitals, setGroupHospitals] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [instrumentIds, setInstrumentIds] = useState<Set<string>>(new Set());
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { filteredData, searchTerm, setSearchTerm } = useSearch(groupsQuery.data ?? [], 'name');

  const availableInstrumentOptions = useMemo(() => {
    const options: { form: { [key: string]: string }; interactive: { [key: string]: string } } = {
      form: {},
      interactive: {}
    };
    for (const instrument of instrumentInfoQuery.data ?? []) {
      if (instrument.kind === 'FORM') {
        options.form[instrument.id] = instrument.details.title;
      } else if (instrument.kind === 'INTERACTIVE') {
        options.interactive[instrument.id] = instrument.details.title;
      }
    }
    return options;
  }, [instrumentInfoQuery.data]);

  const originalInstrumentIds = useMemo(() => {
    if (!selectedGroup) return new Set<string>();
    return new Set(selectedGroup.accessibleInstrumentIds.filter((id) => id in availableInstrumentOptions.form));
  }, [selectedGroup, availableInstrumentOptions.form]);

  useEffect(() => {
    if (!selectedGroup) {
      setGroupHospitals([]);
      setNameValue('');
      setInstrumentIds(new Set());
      return;
    }
    setGroupHospitals(selectedGroup.hospitals ?? []);
    setNameValue(selectedGroup.name);
    setInstrumentIds(originalInstrumentIds);
  }, [selectedGroup, originalInstrumentIds]);

  const knownHospitals = useMemo(() => getHospitalsFromGroups(groupsQuery.data ?? []), [groupsQuery.data]);

  const isDirty = useMemo(() => {
    if (!selectedGroup) return false;
    if (nameValue.trim() !== selectedGroup.name) return true;
    if (!setsAreEqual(instrumentIds, originalInstrumentIds)) return true;
    if (!arraysHaveSameSet(groupHospitals, selectedGroup.hospitals)) return true;
    return false;
  }, [selectedGroup, nameValue, instrumentIds, originalInstrumentIds, groupHospitals]);

  const canSave = Boolean(selectedGroup) && isDirty && nameValue.trim().length > 0;

  return (
    <Sheet open={Boolean(selectedGroup)} onOpenChange={() => setSelectedGroup(null)}>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: 'Gestiona grups',
            fr: 'Gestionar grupos'
          })}
        </Heading>
      </PageHeader>
      <div className="mb-3 flex gap-3">
        <SearchBar
          className="grow"
          placeholder={t({
            en: 'Cerca per nom de grup',
            fr: 'Buscar por nombre de grupo'
          })}
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <Button asChild variant="outline">
          <Link to="/admin/groups/create">
            {t({
              en: 'Afegeix grup',
              fr: 'Añadir grupo'
            })}
          </Link>
        </Button>
      </div>
      <ClientTable<Group>
        columns={[
          {
            field: 'name',
            label: t('common.groupName')
          },
          {
            field: ({ hospitals }) => {
              if (!hospitals.length) {
                return '-';
              }
              const preview = hospitals.slice(0, 4).map(formatHospitalLabel).join(' | ');
              const remaining = hospitals.length - 4;
              return remaining > 0 ? `${preview} | +${remaining} més` : preview;
            },
            label: t({
              en: 'Hospitals',
              fr: 'Hospitales'
            })
          }
        ]}
        data={filteredData}
        entriesPerPage={15}
        minRows={15}
        onEntryClick={setSelectedGroup}
      />
      <Sheet.Content className="flex h-full flex-col overflow-hidden">
        <Sheet.Header>
          <Sheet.Title>{selectedGroup?.name}</Sheet.Title>
          <Sheet.Description>
            {t({
              en: 'Edita la configuració bàsica, els instruments accessibles i els hospitals del grup.',
              fr: 'Edita la configuración básica, los instrumentos accesibles y los hospitales del grupo.'
            })}
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.Body className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-6 pr-1">
          {selectedGroup ? (
            <Form
              key={selectedGroup.id}
              additionalButtons={{
                left: (
                  <Button className="w-full" disabled={!canSave} type="submit" variant="primary">
                    {t('core.save')}
                  </Button>
                ),
                right: (
                  <Button className="w-full" type="button" variant="danger" onClick={() => setIsDeleteOpen(true)}>
                    {t('core.delete')}
                  </Button>
                )
              }}
              content={[
                {
                  fields: {
                    name: {
                      kind: 'string',
                      label: t('common.groupName'),
                      variant: 'input'
                    }
                  },
                  title: t({
                    en: 'Configuració bàsica',
                    fr: 'Configuración básica'
                  })
                },
                {
                  fields: {
                    accessibleFormInstrumentIds: {
                      kind: 'set',
                      label: t('group.manage.forms'),
                      options: availableInstrumentOptions.form,
                      variant: 'listbox'
                    }
                  },
                  title: t('group.manage.accessibleInstruments')
                }
              ]}
              customStyles={{ submitBtn: 'hidden' }}
              fieldsFooter={
                <GroupHospitalManager
                  hospitals={groupHospitals}
                  knownHospitals={knownHospitals}
                  onHospitalsChange={setGroupHospitals}
                />
              }
              initialValues={{
                accessibleFormInstrumentIds: new Set(
                  selectedGroup.accessibleInstrumentIds.filter((id) => id in availableInstrumentOptions.form)
                ),
                name: selectedGroup.name
              }}
              subscribe={{
                onChange: (values) => {
                  const casted = values as { accessibleFormInstrumentIds?: Set<string>; name?: string };
                  setNameValue(casted.name ?? '');
                  setInstrumentIds(new Set(casted.accessibleFormInstrumentIds ?? new Set<string>()));
                },
                selector: (values) => {
                  const casted = values as { accessibleFormInstrumentIds?: Set<string>; name?: string };
                  const ids = casted.accessibleFormInstrumentIds
                    ? Array.from(casted.accessibleFormInstrumentIds).sort().join(',')
                    : '';
                  return `${casted.name ?? ''}::${ids}`;
                }
              }}
              validationSchema={z.object({
                accessibleFormInstrumentIds: z.set(z.string()),
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
              onSubmit={async ({ accessibleFormInstrumentIds, name }) => {
                const preservedInteractiveInstrumentIds = selectedGroup.accessibleInstrumentIds.filter(
                  (id) => id in availableInstrumentOptions.interactive
                );
                await updateGroupMutation.mutateAsync({
                  data: {
                    accessibleInstrumentIds: [...accessibleFormInstrumentIds, ...preservedInteractiveInstrumentIds],
                    hospitals: groupHospitals,
                    name
                  },
                  id: selectedGroup.id
                });
                setSelectedGroup(null);
              }}
            />
          ) : null}
        </Sheet.Body>
      </Sheet.Content>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>{t({ en: 'Elimina el grup', fr: 'Eliminar el grupo' })}</AlertDialog.Title>
            <AlertDialog.Description>
              {selectedGroup
                ? t({
                    en: `Segur que vols eliminar el grup "${selectedGroup.name}"? Aquesta acció no es pot desfer.`,
                    fr: `¿Seguro que quieres eliminar el grupo "${selectedGroup.name}"? Esta acción no se puede deshacer.`
                  })
                : ''}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>{t('core.cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => {
                if (selectedGroup) {
                  deleteGroupMutation.mutate({ id: selectedGroup.id });
                }
                setIsDeleteOpen(false);
                setSelectedGroup(null);
              }}
            >
              {t({ en: 'Elimina', fr: 'Eliminar' })}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Sheet>
  );
};

export const Route = createFileRoute('/_app/admin/groups/')({
  component: RouteComponent,
  loader: ({ context }) => context.queryClient.ensureQueryData(groupsQueryOptions())
});
