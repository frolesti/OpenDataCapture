import React, { useEffect, useMemo, useState } from 'react';

import { isAllUndefined, snakeToCamelCase } from '@douglasneuroinformatics/libjs';
import { estimatePasswordStrength } from '@douglasneuroinformatics/libpasswd';
import {
  Button,
  ClientTable,
  Dialog,
  Form,
  Heading,
  SearchBar,
  Sheet
} from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { FormTypes } from '@opendatacapture/runtime-core';
import { $UserPermission } from '@opendatacapture/schemas/core';
import type { UserPermission } from '@opendatacapture/schemas/core';
import type { User } from '@opendatacapture/schemas/user';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { Promisable } from 'type-fest';
import { z } from 'zod/v4';

import { PageHeader } from '@/components/PageHeader';
import { WithFallback } from '@/components/WithFallback';
import { useDeleteUserMutation } from '@/hooks/useDeleteUserMutation';
import { groupsQueryOptions, useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useSearch } from '@/hooks/useSearch';
import { useUpdateUserMutation } from '@/hooks/useUpdateUserMutation';
import { usersQueryOptions, useUsersQuery } from '@/hooks/useUsersQuery';
import { useAppStore } from '@/store';

type UpdateUserFormData = {
  additionalPermissions?: Partial<UserPermission>[];
  confirmPassword?: string | undefined;
  groupIds: Set<string>;
  password?: string | undefined;
};

type UpdateUserFormInputData = {
  disableDelete: boolean;
  groupOptions: {
    [id: string]: string;
  };
  initialValues?: FormTypes.PartialNullableData<UpdateUserFormData>;
};

const UpdateUserForm: React.FC<{
  data: UpdateUserFormInputData;
  onDelete: () => void;
  onSubmit: (data: UpdateUserFormData & { additionalPermissions?: UserPermission[] }) => Promisable<void>;
}> = ({ data, onDelete, onSubmit }) => {
  const { disableDelete, groupOptions, initialValues } = data;
  const { resolvedLanguage, t } = useTranslation();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const $UpdateUserFormData = useMemo(() => {
    return z
      .object({
        additionalPermissions: z.array($UserPermission.partial()).optional(),
        groupIds: z.set(z.string()),
        password: z.string().min(1).optional()
      })
      .transform((arg) => {
        const firstPermission = arg.additionalPermissions?.[0];
        if (firstPermission && isAllUndefined(firstPermission)) {
          arg.additionalPermissions?.pop();
        }
        return arg;
      })
      .check((ctx) => {
        if (ctx.value.password && !estimatePasswordStrength(ctx.value.password).success) {
          ctx.issues.push({
            code: 'custom',
            fatal: true,
            input: ctx.value.password,
            message: t('common.insufficientPasswordStrength'),
            path: ['password']
          });
          return z.NEVER;
        }
        ctx.value.additionalPermissions?.forEach((permission, i) => {
          Object.entries(permission).forEach(([key, val]) => {
            if ((val satisfies string) === undefined) {
              ctx.issues.push({
                code: 'invalid_type',
                expected: 'string',
                input: val,
                path: ['additionalPermissions', i, key],
                received: 'undefined'
              });
            }
          });
        });
      }) satisfies z.ZodType<UpdateUserFormData>;
  }, [resolvedLanguage]);

  return (
    <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
      <Form
        additionalButtons={{
          left: (
            <Dialog.Trigger asChild>
              <Button className="w-full" disabled={disableDelete} type="button" variant="danger">
                {t('core.delete')}
              </Button>
            </Dialog.Trigger>
          )
        }}
        content={[
          {
            fields: {
              password: {
                calculateStrength: (password) => {
                  return estimatePasswordStrength(password).score;
                },
                kind: 'string',
                label: t('common.password'),
                variant: 'password'
              }
            },
            title: t({
              ca: "Credencials d'inici de sessió",
            })
          },
          {
            description: t({
              ca: "IMPORTANT: Aquests permisos no són específics de cap grup. Per gestionar permisos granulars, utilitzeu l'API.",
            }),
            fields: {
              additionalPermissions: {
                fieldset: {
                  action: {
                    kind: 'string',
                    label: t({
                      ca: 'Acció',
                    }),
                    options: {
                      create: t({
                        ca: 'Crear',
                      }),
                      delete: t({
                        ca: 'Eliminar',
                      }),
                      manage: t({
                        ca: 'Gestionar (Tot)',
                      }),
                      read: t({
                        ca: 'Llegir',
                      }),
                      update: t({
                        ca: 'Actualitzar',
                      })
                    },
                    variant: 'select'
                  },
                  subject: {
                    kind: 'string',
                    label: t({
                      ca: 'Recurs',
                    }),
                    options: {
                      all: t({
                        ca: 'Tot',
                      }),
                      Assignment: t({
                        ca: 'Assignació',
                      }),
                      Group: t({
                        ca: 'Grup',
                      }),
                      Instrument: t({
                        ca: 'Instrument',
                      }),
                      InstrumentRecord: t({
                        ca: "Registre de l'instrument",
                      }),
                      Session: t({
                        ca: 'Sessió',
                      }),
                      Subject: t({
                        ca: 'Subjecte',
                      }),
                      User: t({
                        ca: 'Usuari',
                      })
                    },
                    variant: 'select'
                  }
                },
                kind: 'record-array',
                label: t({
                  ca: 'Permisos addicionals',
                })
              }
            },
            title: t({
              ca: 'Autorització',
            })
          },
          {
            fields: {
              groupIds: {
                kind: 'set',
                label: 'Group IDs',
                options: groupOptions,
                variant: 'listbox'
              }
            },
            title: t({
              ca: 'Grups',
            })
          }
        ]}
        data-testid="update-user-form"
        initialValues={initialValues}
        key={JSON.stringify(initialValues)}
        submitBtnLabel={t('core.save')}
        validationSchema={$UpdateUserFormData}
        onSubmit={({ additionalPermissions, ...data }) =>
          onSubmit({ additionalPermissions: additionalPermissions as undefined | UserPermission[], ...data })
        }
      />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            {t({
              ca: 'Esteu absolutament segur?',
            })}
          </Dialog.Title>
          <Dialog.Description>
            {t({
              ca: 'Aquesta acció eliminarà permanentment el compte i no es pot desfer.',
            })}
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button className="min-w-16" type="button" variant="danger" onClick={onDelete}>
            {t('core.yes')}
          </Button>
          <Button className="min-w-16" type="button" variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
            {t('core.no')}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};

const RouteComponent = () => {
  const currentUser = useAppStore((store) => store.currentUser);
  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const usersQuery = useUsersQuery();
  const deleteUserMutation = useDeleteUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const [selectedUser, setSelectedUser] = useState<null | User>(null);
  const { filteredData, searchTerm, setSearchTerm } = useSearch(usersQuery.data ?? [], 'username');

  const [data, setData] = useState<null | UpdateUserFormInputData>(null);

  useEffect(() => {
    const groups = groupsQuery.data;
    if (!selectedUser || !groups) {
      setData(null);
    } else {
      setData({
        disableDelete: selectedUser?.username === currentUser?.username,
        groupOptions: Object.fromEntries(groups.map((group) => [group.id, group.name])),
        initialValues: {
          additionalPermissions: selectedUser.additionalPermissions,
          groupIds: new Set(selectedUser.groupIds)
        }
      });
    }
  }, [groupsQuery.data, selectedUser]);

  return (
    <Sheet open={Boolean(selectedUser)} onOpenChange={() => setSelectedUser(null)}>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            ca: 'Gestionar usuaris',
          })}
        </Heading>
      </PageHeader>
      <div className="mb-3 flex gap-3">
        <SearchBar
          className="grow"
          data-testid="admin-users-search"
          placeholder={t({
            ca: "Cercar per nom d'usuari",
          })}
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <Button variant="outline">
          <Link to="/admin/users/create">
            {t({
              ca: 'Afegir usuari',
            })}
          </Link>
        </Button>
      </div>
      <ClientTable<User>
        columns={[
          {
            field: 'username',
            label: t('common.username')
          },
          {
            field: ({ basePermissionLevel }) => {
              if (!basePermissionLevel) {
                return t({
                  ca: 'Cap',
                });
              }
              return t(`common.${snakeToCamelCase(basePermissionLevel)}`);
            },
            label: t('common.basePermissionLevel')
          }
        ]}
        data={filteredData}
        data-testid="admin-users-table"
        entriesPerPage={15}
        minRows={15}
        onEntryClick={setSelectedUser}
      />
      <Sheet.Content className="flex flex-col p-0" data-testid="admin-user-edit-sheet">
        <Sheet.Header className="px-6 pt-6">
          <Sheet.Title>{selectedUser?.username}</Sheet.Title>
          <Sheet.Description>
            {t({
              ca: 'Feu els canvis a aquest usuari aquí. Feu clic a desar quan hàgiu acabat.',
            })}
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.Body className="grow overflow-y-scroll px-6 pb-6">
          <WithFallback
            Component={UpdateUserForm}
            minDelay={1000}
            props={{
              data,
              onDelete: () => {
                deleteUserMutation.mutate({ id: selectedUser!.id });
                setSelectedUser(null);
              },
              onSubmit: ({ groupIds, ...data }) => {
                void updateUserMutation
                  .mutateAsync({ data: { groupIds: Array.from(groupIds), ...data }, id: selectedUser!.id })
                  .then(() => {
                    setSelectedUser(null);
                  });
              }
            }}
          />
        </Sheet.Body>
      </Sheet.Content>
    </Sheet>
  );
};

export const Route = createFileRoute('/_app/admin/users/')({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(groupsQueryOptions());
    await context.queryClient.ensureQueryData(usersQueryOptions());
  }
});
