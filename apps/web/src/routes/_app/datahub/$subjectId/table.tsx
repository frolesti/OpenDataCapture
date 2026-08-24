import { camelToSnakeCase } from '@douglasneuroinformatics/libjs';
import React from 'react';

import { ActionDropdown, ClientTable, Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { createFileRoute } from '@tanstack/react-router';

import { SelectInstrument } from '@/components/SelectInstrument';
import { TimeDropdown } from '@/components/TimeDropdown';
import { useInstrumentVisualization } from '@/hooks/useInstrumentVisualization';

const SelectTrigger = Select.Trigger as React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
const SelectContent = Select.Content as React.ComponentType<React.PropsWithChildren<unknown>>;
const SelectItem = Select.Item as React.ComponentType<React.PropsWithChildren<{ value: string }>>;

const formatDisplayDate = (value: Date) => {
  const isoDate = value.toISOString().slice(0, 10);
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

const RouteComponent = () => {
  const params = Route.useParams();
  const [entriesPerPage, setEntriesPerPage] = React.useState(15);
  const { dl, instrumentId, instrumentOptions, records, setInstrumentId, setMinDate } = useInstrumentVisualization({
    params: { subjectId: params.subjectId }
  });

  const { t } = useTranslation();

  const fields: { field: string; label: string }[] = [];
  for (const subItem in records[0]) {
    if (!subItem.startsWith('__')) {
      fields.push({
        field: subItem,
        label: camelToSnakeCase(subItem).toUpperCase()
      });
    }
  }

  return (
    <div>
      <div className="mb-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
          <div className="flex">
            <SelectInstrument options={instrumentOptions} onSelect={setInstrumentId} />
          </div>
          <div className="flex flex-col gap-2 lg:flex-row">
            <Select value={String(entriesPerPage)} onValueChange={(value) => setEntriesPerPage(Number(value))}>
              <SelectTrigger className="min-w-32">
                <span>{entriesPerPage} filas</span>
              </SelectTrigger>
              <SelectContent>
                {[15, 25, 50, 100].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} filas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TimeDropdown disabled={!instrumentId} setMinTime={setMinDate} />
            <ActionDropdown
              widthFull
              data-spotlight-type="export-data-dropdown"
              disabled={!instrumentId}
              options={['CSV', 'CSV Long', 'Excel', 'Excel Long']}
              title={t('core.download')}
              triggerClassName="min-w-32"
              onSelection={dl}
            />
          </div>
        </div>
      </div>
      <ClientTable
        noWrap
        columns={[
          {
            field: '__date__',
            formatter: formatDisplayDate,
            label: 'DATE_COLLECTED'
          },
          ...fields
        ]}
        data={records}
        data-testid="subject-table"
        entriesPerPage={entriesPerPage}
        minRows={entriesPerPage}
      />
    </div>
  );
};

export const Route = createFileRoute('/_app/datahub/$subjectId/table')({
  component: RouteComponent
});
