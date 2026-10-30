import { Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';

import { formatHospitalLabel } from './hospitals';

export function HospitalSelect({
  onValueChange,
  ariaLabel,
  options,
  value
}: {
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  options: string[];
  value: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className="w-full min-w-0 [&>span]:truncate"
        disabled={options.length === 0}
      >
        <span className="min-w-0 truncate">
          {value ? (
            formatHospitalLabel(value)
          ) : (
            <Select.Value placeholder={t({ en: 'Selecciona un hospital', fr: 'Selecciona un hospital' })} />
          )}
        </span>
      </Select.Trigger>
      <Select.Content
        className="max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-0 max-w-[calc(100vw-2rem)] [&_[data-radix-select-viewport]]:min-w-0"
        collisionPadding={16}
        position="popper"
        sideOffset={4}
      >
        {options.map((hospital) => (
          <Select.Item className="whitespace-normal break-words [&>span]:min-w-0" key={hospital} value={hospital}>
            {formatHospitalLabel(hospital)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}
