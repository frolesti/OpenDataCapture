import type { FormInstrument, Language } from '@opendatacapture/runtime-core';

type DisplayField = FormInstrument.StaticField<Language>;
type DisplayOptions = {
  field?: DisplayField | null;
  formatFieldLabel?: (key: string) => string;
  formatString?: (value: string) => string;
  parseJson?: boolean;
};

function humanizeLabel(key: string) {
  const label = key.replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatClinicalDataValue(value: unknown, options: DisplayOptions = {}): unknown {
  const { field, formatFieldLabel = humanizeLabel, formatString = (value) => value } = options;
  const labels: Readonly<Record<string, string>> | undefined = field && 'options' in field ? field.options : undefined;
  if (typeof value === 'string') {
    const isComposite =
      options.parseJson || field?.kind === 'set' || field?.kind === 'record-array' || field?.kind === 'number-record';
    const isSerializedSet = value.includes('"__deserializedType"') && value.includes('"__isSerializedType"');
    if ((isComposite || isSerializedSet) && /^[\s]*[[{]/.test(value)) {
      let decoded: unknown;
      try {
        decoded = JSON.parse(value) as unknown;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.error('Cannot decode a serialized clinical response', error);
        return 'Error: respuesta no legible';
      }
      return formatClinicalDataValue(decoded, { ...options, parseJson: false });
    }
    return labels?.[value] ?? formatString(value);
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === null || typeof value !== 'object') return value;

  if (
    '__deserializedType' in value &&
    value.__deserializedType === 'Set' &&
    '__isSerializedType' in value &&
    value.__isSerializedType === true &&
    'value' in value &&
    Array.isArray(value.value)
  ) {
    return formatClinicalDataValue(new Set(value.value), options);
  }
  if (value instanceof Set || Array.isArray(value)) {
    return Array.from(value)
      .map((entry: unknown, index) => {
        const text = formatClinicalDataValue(entry, options) ?? 'NA';
        return entry !== null && typeof entry === 'object' && !(entry instanceof Date) && !(entry instanceof Set)
          ? `${index + 1}. ${String(text)}`
          : String(text);
      })
      .join(
        field?.kind === 'record-array' ||
          (Array.isArray(value) && value.some((entry) => entry !== null && typeof entry === 'object'))
          ? ' | '
          : ', '
      );
  }

  return Object.entries(value)
    .map(([key, entry]) => {
      const candidate = field?.kind === 'record-array' ? field.fieldset[key] : undefined;
      const childField =
        candidate?.kind === 'dynamic' ? candidate.render(value as Parameters<typeof candidate.render>[0]) : candidate;
      const label =
        childField?.label ??
        (field?.kind === 'number-record' ? field.items[key]?.label : undefined) ??
        formatFieldLabel(key);
      const text = formatClinicalDataValue(entry, { ...options, field: childField, parseJson: false }) ?? 'NA';
      return `${label}: ${String(text)}`;
    })
    .join('; ');
}

export function formatClinicalRecordValues(
  data: Record<string, unknown>,
  content?: FormInstrument.Content<FormInstrument.Data, Language>
): Record<string, unknown> {
  const fields: Partial<FormInstrument.Fields<FormInstrument.Data, Language>> | undefined = Array.isArray(content)
    ? Object.fromEntries(content.flatMap((group) => Object.entries(group.fields)))
    : content;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const candidate = fields?.[key];
      const field = candidate?.kind === 'dynamic' ? candidate.render(data as FormInstrument.PartialData) : candidate;
      return [key, formatClinicalDataValue(value, { field })];
    })
  );
}
