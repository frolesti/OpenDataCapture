import { describe, expect, it } from 'vitest';

import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';

describe('instrument drafts', () => {
  it('preserves nested multiselect values and the timestamp', () => {
    const data = { adverse_event_records: [{ seriousness: new Set(['riesgo_vida', 'hospitalizacion']) }] };
    const draft = deserializeInstrumentDraft(serializeInstrumentDraft(data, 123));
    expect(draft).toEqual({ data, timestamp: 123 });
    expect(
      (draft.data.adverse_event_records as typeof data.adverse_event_records)[0]!.seriousness.has('riesgo_vida')
    ).toBe(true);
  });

  it('recovers lost legacy seriousness selections as an editable empty set', () => {
    const draft = deserializeInstrumentDraft(
      JSON.stringify({
        data: { adverse_event_records: [{ seriousness: {}, reaction: 'Dolor' }], other: {} },
        timestamp: 123
      })
    );
    expect(draft.data).toEqual({
      adverse_event_records: [{ seriousness: new Set(), reaction: 'Dolor' }],
      other: {}
    });
  });
});
