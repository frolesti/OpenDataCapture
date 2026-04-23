import { AppFactory } from '@douglasneuroinformatics/libnest';
import { PrismaClient } from '@prisma/client';

import { AssignmentsModule } from './assignments/assignments.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { $Env } from './core/env.schema';
import { GatewayModule } from './gateway/gateway.module';
import { GroupsModule } from './groups/groups.module';
import { InstrumentRecordsModule } from './instrument-records/instrument-records.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { SessionsModule } from './sessions/sessions.module';
import { SetupModule } from './setup/setup.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SummaryModule } from './summary/summary.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';
import { ConfiguredAuthModule } from './vendor/configured.auth.module';

export default AppFactory.create({
  docs: {
    contact: {
      email: 'info@altamedicalservices.com',
      name: 'Douglas Neuroinformatics',
      url: 'https://douglasneuroinformatics.ca'
    },
    description: 'Documentation for the REST API for Open Data Capture',
    externalDoc: {
      description: 'Homepage',
      url: 'https://opendatacapture.org'
    },
    license: {
      name: 'Apache-2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0'
    },
    path: '/',
    tags: ['Authentication', 'Audit Log', 'Groups', 'Instruments', 'Instrument Records', 'Subjects', 'Users'],
    title: 'Open Data Capture'
  },
  envSchema: $Env,
  imports: [
    AuditLogModule,
    ConfiguredAuthModule,
    GroupsModule,
    InstrumentRecordsModule,
    InstrumentsModule,
    SessionsModule,
    SetupModule,
    SubjectsModule,
    SummaryModule,
    SupportModule,
    UsersModule,
    {
      module: AssignmentsModule,
      when: 'GATEWAY_ENABLED'
    },
    {
      module: GatewayModule,
      when: 'GATEWAY_ENABLED'
    }
  ],
  prisma: {
    client: {
      constructor: PrismaClient
    },
    dbPrefix: 'data-capture'
  },
  version: '1'
});
