import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import { parseDuration } from '@douglasneuroinformatics/libjs';
import { Card, Heading } from '@douglasneuroinformatics/libui/components';
import { useInterval, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { $GatewayHealthcheckResult } from '@opendatacapture/schemas/gateway';
import type { ReleaseInfo } from '@opendatacapture/schemas/setup';
import { createFileRoute } from '@tanstack/react-router';
import axios from 'axios';

import { PageHeader } from '@/components/PageHeader';
import { setupStateQueryOptions, useSetupStateQuery } from '@/hooks/useSetupStateQuery';

const translations = {
  branch: {},
  buildDate: {},
  buildType: {},
  buildTypes: {
    development: {},
    production: {},
    test: {}
  },
  enabled: {},
  status: {},
  uptime: {},
  version: {}
};

const loadGatewayHealthcheckData = async () => {
  const response = await axios.get('/v1/gateway/healthcheck');
  return $GatewayHealthcheckResult.parse(response.data);
};

const TimeValue: React.FC<{ value: number }> = ({ value }) => {
  const format = useCallback((uptime: number) => {
    return parseDuration(uptime * 1000).match(
      ({ days, hours, minutes, seconds }) => {
        hours += days * 24;
        return [hours, minutes, seconds].map((value) => (value < 10 ? '0' + value : value)).join(':');
      },
      (err) => {
        console.error(err);
        return 'ERROR';
      }
    );
  }, []);
  const valueRef = useRef<number>(value);

  const [state, setState] = useState(format(value));

  useInterval(() => {
    valueRef.current = valueRef.current + 1;
    setState(format(valueRef.current + 1));
  }, 1000);

  return <span>{state}</span>;
};

const InfoBlock: React.FC<{
  items: {
    [key: string]: string;
  };
  label: string;
}> = ({ items, label }) => {
  return (
    <div>
      <h5 className="mb-1 font-semibold">{label}</h5>
      <ul className="text-muted-foreground grid gap-0.5">
        {Object.entries(items).map(([key, value]) => (
          <li key={key}>
            <span>{key}: </span>
            {value.startsWith('Uptime=') ? <TimeValue value={parseInt(value.slice(7))} /> : <span>{value}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

const RouteComponent = () => {
  const { resolvedLanguage, t } = useTranslation();
  const setupStateQuery = useSetupStateQuery();
  const gatewayHealthData = Route.useLoaderData({ select: (match) => match.gatewayHealthData });

  const { isGatewayEnabled } = setupStateQuery.data;

  const translateReleaseInfo = (release: ReleaseInfo) => {
    const translatedReleaseInfo = {
      [t(translations.buildDate)]: new Date(release.buildTime).toLocaleDateString(resolvedLanguage, {
        dateStyle: 'long'
      }),
      [t(translations.buildType)]: t(translations.buildTypes[release.type]),
      [t(translations.version)]: release.version
    };
    if (release.type !== 'production') {
      translatedReleaseInfo[t(translations.branch)] = release.branch;
      translatedReleaseInfo.Commit = release.commit;
    }
    return translatedReleaseInfo;
  };

  const getTranslatedGatewayInfo = () => {
    const gatewayInfo: { [key: string]: string } = {};
    gatewayInfo[t(translations.enabled)] = isGatewayEnabled ? t('core.yes') : t('core.no');
    if (!isGatewayEnabled) {
      return gatewayInfo;
    }
    gatewayInfo[t(translations.status)] = gatewayHealthData!.status.toString();
    if (gatewayHealthData!.ok) {
      Object.assign(gatewayInfo, translateReleaseInfo(gatewayHealthData!.release), {
        [t(translations.uptime)]: `Uptime=${gatewayHealthData!.uptime}`
      });
    }
    return gatewayInfo;
  };

  const currentDateString = new Date().toLocaleDateString(resolvedLanguage, {
    dateStyle: 'long'
  });

  return (
    <div className="space-y-6">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: 'Sobre Alta Medical Services'
          })}
        </Heading>
      </PageHeader>

      {/* Platform Overview Card */}
      <Card>
        <Card.Header>
          <Card.Title>{t('common.about.platformOverview.title')}</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-muted-foreground">{t('common.about.description')}</p>
          <p className="text-muted-foreground mt-4">{t('common.about.platformOverview.description')}</p>
        </Card.Content>
      </Card>

      {/* Digital Instruments Card */}
      <Card>
        <Card.Header>
          <Card.Title>{t('common.about.instruments.title')}</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-muted-foreground">{t('common.about.instruments.description')}</p>
        </Card.Content>
      </Card>

      {/* Key Features Card */}
      <Card>
        <Card.Header>
          <Card.Title>{t('common.about.keyFeatures.title')}</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div>
            <h4 className="mb-1 font-semibold">{t('common.about.keyFeatures.sessions.title')}</h4>
            <p className="text-muted-foreground text-sm">{t('common.about.keyFeatures.sessions.description')}</p>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">{t('common.about.keyFeatures.datahub.title')}</h4>
            <p className="text-muted-foreground text-sm">{t('common.about.keyFeatures.datahub.description')}</p>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">{t('common.about.keyFeatures.groups.title')}</h4>
            <p className="text-muted-foreground text-sm">{t('common.about.keyFeatures.groups.description')}</p>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">{t('common.about.keyFeatures.security.title')}</h4>
            <p className="text-muted-foreground text-sm">{t('common.about.keyFeatures.security.description')}</p>
          </div>
        </Card.Content>
      </Card>

      {/* Technical Information Card */}
      <Card>
        <Card.Header className="border-b">
          <Card.Title>{t('common.about.technicalInfo.title')}</Card.Title>
          <Card.Description>{t('common.about.technicalInfo.description')}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-6 p-6 text-sm">
          <InfoBlock items={translateReleaseInfo(__RELEASE__)} label={t('common.about.webClient')} />
          <InfoBlock
            items={{
              ...translateReleaseInfo(setupStateQuery.data.release),
              [t(translations.uptime)]: `Uptime=${setupStateQuery.data.uptime}`
            }}
            label={t('common.about.coreApi')}
          />
          <InfoBlock items={getTranslatedGatewayInfo()} label={t('common.about.gatewayService')} />
        </Card.Content>
        <Card.Footer className="border-t px-6 py-3">
          <p className="text-muted-foreground text-xs">
            {t('common.about.generatedOn')} {currentDateString}
          </p>
        </Card.Footer>
      </Card>
    </div>
  );
};

export const Route = createFileRoute('/_app/about')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const { isGatewayEnabled } = await context.queryClient.ensureQueryData(setupStateQueryOptions());
    return { gatewayHealthData: isGatewayEnabled ? await loadGatewayHealthcheckData() : null };
  }
});
