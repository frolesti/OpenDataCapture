import { AuthModule, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { Module } from '@nestjs/common';
import { $LoginCredentials } from '@opendatacapture/schemas/auth';

@Module({
  imports: [
    AuthModule.forRootAsync({
      inject: [getModelToken('User')],
      useFactory: (userModel: Model<'User'>) => {
        return {
          defineAbility: (ability, payload, metadata) => {
            const groupIds = payload.groups.map((group) => group.id);
            const userId = (payload as any).id;
            switch (payload.basePermissionLevel) {
              case 'ADMIN':
                ability.can('manage', 'all');
                break;
              case 'GROUP_MANAGER':
                ability.can('manage', 'Assignment', { groupId: { in: groupIds } });
                ability.can('manage', 'Group', { id: { in: groupIds } });
                ability.can('read', 'AuditLog', { groupId: { in: groupIds } });
                ability.can('read', 'Instrument');
                ability.can('create', 'InstrumentRecord');
                ability.can('read', 'InstrumentRecord', { groupId: { in: groupIds } });
                ability.can('update', 'InstrumentRecord', { groupId: { in: groupIds } });
                ability.can('create', 'Session');
                ability.can('read', 'Session', { groupId: { in: groupIds } });
                ability.can('create', 'Subject');
                ability.can('read', 'Subject', { groupIds: { hasSome: groupIds } });
                ability.can('read', 'User', { groupIds: { hasSome: groupIds } });
                ability.can('update', 'User', { id: userId });
                break;
              case 'STANDARD':
                ability.can('read', 'Group', { id: { in: groupIds } });
                ability.can('read', 'Instrument');
                ability.can('create', 'InstrumentRecord');
                ability.can('read', 'InstrumentRecord', {
                  groupId: { in: groupIds },
                  session: { userId }
                });
                ability.can('update', 'InstrumentRecord', {
                  groupId: { in: groupIds },
                  session: { userId }
                });
                ability.can('read', 'Session', { groupId: { in: groupIds } });
                ability.can('create', 'Session');
                ability.can('create', 'Subject');
                ability.can('read', 'Subject', { groupIds: { hasSome: groupIds } });
                ability.can('update', 'User', { id: userId });
                break;
            }
            metadata.additionalPermissions?.forEach(({ action, subject }) => {
              ability.can(action, subject);
            });
          },
          schemas: {
            loginCredentials: $LoginCredentials
          },
          userQuery: async ({ username }) => {
            const user = await userModel.findFirst({
              include: { groups: true },
              where: { username }
            });
            if (!user) {
              return null;
            }
            return {
              hashedPassword: user.hashedPassword,
              metadata: {
                additionalPermissions: user.additionalPermissions
              },
              tokenPayload: {
                basePermissionLevel: user.basePermissionLevel,
                firstName: user.firstName,
                groups: user.groups,
                id: user.id,
                lastName: user.lastName,
                username: user.username
              } as any
            };
          }
        };
      }
    })
  ]
})
export class ConfiguredAuthModule {}
