import { useState } from 'react';

import { Button, ClientTable, Heading, SearchBar, Sheet } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group } from '@opendatacapture/schemas/group';
import { createFileRoute, Link } from '@tanstack/react-router';

import { PageHeader } from '@/components/PageHeader';
import { useDeleteGroupMutation } from '@/hooks/useDeleteGroupMutation';
import { groupsQueryOptions, useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useSearch } from '@/hooks/useSearch';

const RouteComponent = () => {
  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const deleteGroupMutation = useDeleteGroupMutation();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const { filteredData, searchTerm, setSearchTerm } = useSearch(groupsQuery.data ?? [], 'name');

  return (
    <Sheet open={Boolean(selectedGroup)} onOpenChange={() => setSelectedGroup(null)}>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: 'Gestionar grups'
          })}
        </Heading>
      </PageHeader>
      <div className="mb-3 flex gap-3">
        <SearchBar
          className="grow"
          placeholder={t({
            en: 'Cercar per nom de grup'
          })}
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <Button asChild variant="outline">
          <Link to="/admin/groups/create">
            {t({
              en: 'Afegir grup'
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
            field: ({ type }) => {
              if (type === 'CLINICAL') {
                return t('common.clinical');
              } else if (type === 'RESEARCH') {
                return t('common.research');
              }
              return type satisfies never;
            },
            label: t('common.groupType')
          }
        ]}
        data={filteredData}
        entriesPerPage={15}
        minRows={15}
        onEntryClick={setSelectedGroup}
      />
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>{selectedGroup?.name}</Sheet.Title>
          <Sheet.Description>
            {t({
              en: 'Feu els canvis a aquest grup aquí. Feu clic a desar quan hàgiu acabat.'
            })}
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.Body className="grid gap-4"></Sheet.Body>
        <Sheet.Footer>
          <Button
            className="w-full"
            type="button"
            variant="danger"
            onClick={() => {
              deleteGroupMutation.mutate({ id: selectedGroup!.id });
              setSelectedGroup(null);
            }}
          >
            {t('core.delete')}
          </Button>
          <Sheet.Close asChild>
            <Button disabled className="w-full" type="submit">
              {t('core.save')}
            </Button>
          </Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
};

export const Route = createFileRoute('/_app/admin/groups/')({
  component: RouteComponent,
  loader: ({ context }) => context.queryClient.ensureQueryData(groupsQueryOptions())
});
