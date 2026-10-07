import { replacer, reviver } from '@douglasneuroinformatics/libjs';

export function serializeInstrumentDraft(data: Record<string, unknown>, timestamp = Date.now()): string {
  return JSON.stringify({ data, timestamp }, replacer);
}

export function deserializeInstrumentDraft(raw: string): { data: Record<string, unknown>; timestamp: number } {
  const draft = JSON.parse(raw, reviver) as { data: Record<string, unknown>; timestamp: number };
  const records = draft.data.adverse_event_records;
  if (Array.isArray(records)) {
    for (const record of records as Record<string, unknown>[]) {
      const seriousness = record.seriousness;
      if (
        seriousness !== null &&
        typeof seriousness === 'object' &&
        !(seriousness instanceof Set) &&
        !Array.isArray(seriousness) &&
        Object.keys(seriousness).length === 0
      ) {
        record.seriousness = new Set<string>();
      }
    }
  }
  return draft;
}
