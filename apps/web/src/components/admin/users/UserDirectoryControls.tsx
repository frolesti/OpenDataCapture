import { Button, Label, SearchBar, Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { ClockIcon, UsersIcon } from '@heroicons/react/24/outline';

export type ViewMode = 'pending' | 'users';
export type ProfileFilter = 'ALL' | 'INVESTIGATOR' | 'PENDING_INVESTIGATOR' | 'USER';
export type PendingTypeFilter = 'ALL' | 'PENDING_INVESTIGATOR';

export type UserDirectoryControlsProps = {
  groupOptions: Array<{ id: string; name: string }>;
  pendingGroupFilter: string;
  pendingTypeFilter: PendingTypeFilter;
  profileFilter: ProfileFilter;
  searchTerm: string;
  setPendingGroupFilter: (value: string) => void;
  setPendingTypeFilter: (value: PendingTypeFilter) => void;
  setProfileFilter: (value: ProfileFilter) => void;
  setSearchTerm: (value: string) => void;
  setUserGroupFilter: (value: string) => void;
  setViewMode: (value: ViewMode) => void;
  userGroupFilter: string;
  viewMode: ViewMode;
};

export const UserDirectoryControls = ({
  groupOptions,
  pendingGroupFilter,
  pendingTypeFilter,
  profileFilter,
  searchTerm,
  setPendingGroupFilter,
  setPendingTypeFilter,
  setProfileFilter,
  setSearchTerm,
  setUserGroupFilter,
  setViewMode,
  userGroupFilter,
  viewMode
}: UserDirectoryControlsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <SearchBar
        className="grow"
        placeholder={
          viewMode === 'pending'
            ? t({
                en: 'Cerca investigadors pendents per nom o correu',
                fr: 'Buscar investigadores pendientes por nombre o correo'
              })
            : t({
                en: 'Cerca usuaris per nom, usuari o correu',
                fr: 'Buscar usuarios por nombre, usuario o correo'
              })
        }
        value={searchTerm}
        onValueChange={setSearchTerm}
      />

      <div className="flex items-center justify-end">
        <div className="flex rounded-md border border-violet-300 bg-violet-100 p-1">
          <Button
            className={
              viewMode === 'users'
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'text-violet-900 hover:bg-violet-200'
            }
            size="sm"
            type="button"
            variant={viewMode === 'users' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('users')}
          >
            <UsersIcon className="mr-1 h-4 w-4" />
            {t({ en: 'Tots els usuaris', fr: 'Todos los usuarios' })}
          </Button>
          <Button
            className={
              viewMode === 'pending'
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'text-violet-900 hover:bg-violet-200'
            }
            size="sm"
            type="button"
            variant={viewMode === 'pending' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('pending')}
          >
            <ClockIcon className="mr-1 h-4 w-4" />
            {t({ en: 'Investigadors pendents', fr: 'Investigadores pendientes' })}
          </Button>
        </div>
      </div>

      {viewMode === 'pending' ? (
        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Label>{t({ en: 'Filtre de grup', fr: 'Filtro de grupo' })}</Label>
            <Select value={pendingGroupFilter} onValueChange={setPendingGroupFilter}>
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="ALL">{t({ en: 'Tots', fr: 'Todos' })}</Select.Item>
                {groupOptions.map((group) => (
                  <Select.Item key={group.id} value={group.id}>
                    {group.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>{t({ en: "Tipus d'usuari", fr: 'Tipo de usuario' })}</Label>
            <Select
              value={pendingTypeFilter}
              onValueChange={(value) => setPendingTypeFilter(value as PendingTypeFilter)}
            >
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="ALL">{t({ en: 'Tots', fr: 'Todos' })}</Select.Item>
                <Select.Item value="PENDING_INVESTIGATOR">
                  {t({ en: 'Investigador (pendent)', fr: 'Investigador (pendiente)' })}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Label>{t({ en: 'Filtre de grup', fr: 'Filtro de grupo' })}</Label>
            <Select value={userGroupFilter} onValueChange={setUserGroupFilter}>
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="ALL">{t({ en: 'Tots', fr: 'Todos' })}</Select.Item>
                {groupOptions.map((group) => (
                  <Select.Item key={group.id} value={group.id}>
                    {group.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>{t({ en: "Tipus d'usuari", fr: 'Tipo de usuario' })}</Label>
            <Select value={profileFilter} onValueChange={(value) => setProfileFilter(value as ProfileFilter)}>
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="ALL">{t({ en: 'Tots', fr: 'Todos' })}</Select.Item>
                <Select.Item value="USER">{t({ en: 'Usuari', fr: 'Usuario' })}</Select.Item>
                <Select.Item value="INVESTIGATOR">{t({ en: 'Investigador', fr: 'Investigador' })}</Select.Item>
                <Select.Item value="PENDING_INVESTIGATOR">
                  {t({ en: 'Investigador (pendent)', fr: 'Investigador (pendiente)' })}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      )}
    </>
  );
};
