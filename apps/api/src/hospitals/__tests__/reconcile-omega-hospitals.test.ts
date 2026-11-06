import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

type Hospital = {
  aliasKeys: string[];
  id: string;
  isInternal: boolean;
  key: string;
  name: string;
};
type Snapshot = {
  group: { hospitalIds: string[]; hospitals: string[] };
  hospitals: Hospital[];
  recordNames: string[];
};
type PlannedHospital = Omit<Hospital, 'id'> & { id: null | string };
type Reconciliation = {
  buildPlan: (
    snapshot: Snapshot,
    legacyNames: string[]
  ) => {
    additions: PlannedHospital[];
    aliasUpdates: PlannedHospital[];
    hospitals: PlannedHospital[];
  };
  normalize: (value: string) => string;
};

function isReconciliation(value: unknown): value is Reconciliation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'buildPlan' in value &&
    typeof value.buildPlan === 'function' &&
    'normalize' in value &&
    typeof value.normalize === 'function'
  );
}

const reconciliation: unknown = createRequire(import.meta.url)('../../../../../scripts/reconcile-omega-hospitals.cjs');
if (!isReconciliation(reconciliation)) throw new Error('Invalid reconciliation script exports');
const { buildPlan, normalize } = reconciliation;

function snapshot() {
  return {
    group: { hospitalIds: ['avila'], hospitals: ['CS Ávila Norte (Ávila)'] },
    hospitals: [
      {
        aliasKeys: [normalize('CS Ávila Norte (Ávila)')],
        id: 'avila',
        isInternal: false,
        key: normalize('CS Ávila Norte (Ávila)'),
        name: 'CS Ávila Norte (Ávila)'
      },
      {
        aliasKeys: [normalize('CS Juncal (Torrejón de Ardoz)')],
        id: 'juncal',
        isInternal: false,
        key: normalize('CS Juncal (Torrejón de Ardoz)'),
        name: 'CS Juncal (Torrejón de Ardoz)'
      }
    ],
    recordNames: ['CS Ávila Norte', 'CS Juncal (Torrejón de Ardoz)']
  };
}

describe('conservative OMEGA hospital union', () => {
  it('retains existing IDs and joins original and historical names without duplicates', () => {
    const source = snapshot();
    const before = structuredClone(source);
    const plan = buildPlan(source, ['CS Ávila Norte', 'CS José Aguado']);
    expect(plan.hospitals.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'avila', name: 'CS Ávila Norte (Ávila)' },
      { id: null, name: 'CS José Aguado' },
      { id: 'juncal', name: 'CS Juncal (Torrejón de Ardoz)' }
    ]);
    expect(plan.hospitals[0]!.aliasKeys).toContain(normalize('CS Ávila Norte'));
    expect(source).toEqual(before);
  });

  it('is idempotent after adding identities and aliases', () => {
    const source = snapshot();
    const first = buildPlan(source, ['CS Ávila Norte', 'CS José Aguado']);
    const hospitals = first.hospitals.map((hospital) => ({ ...hospital, id: hospital.id ?? 'jose' }));
    const second = buildPlan(
      {
        ...source,
        group: { hospitalIds: hospitals.map((h) => h.id), hospitals: hospitals.map((h) => h.name) },
        hospitals
      },
      ['CS Ávila Norte', 'CS José Aguado']
    );
    expect(second.additions).toEqual([]);
    expect(second.aliasUpdates).toEqual([]);
  });

  it('does not merge nearby centres solely because their district is the same', () => {
    const source = snapshot();
    source.recordNames = ['CS Alhama de Granada (Granada)', 'CS Aguadulce Sur (Almería)'];
    const plan = buildPlan(source, []);
    expect(plan.additions.map((hospital) => hospital.name)).toEqual(source.recordNames);
    expect(plan.additions.every((hospital) => hospital.id === null)).toBe(true);
  });

  it('preserves the confirmed Almenara catalogue ID', () => {
    const name = 'Centro Auxiliar Playa Almenara y Centro Auxiliar Playa Chilches';
    const source = {
      group: { hospitalIds: ['almenara'], hospitals: [name] },
      hospitals: [{ aliasKeys: [normalize(name)], id: 'almenara', isInternal: false, key: normalize(name), name }],
      recordNames: []
    };
    const plan = buildPlan(source, ["Consultori La Platja d'Almenara"]);
    expect(plan.additions).toEqual([]);
    expect(plan.hospitals[0]!.id).toBe('almenara');
    expect(plan.hospitals[0]!.aliasKeys).toContain(normalize("Consultori La Platja d'Almenara"));
  });

  it('rejects conflicting identities rather than merging their IDs', () => {
    const source = snapshot();
    source.hospitals.push({
      aliasKeys: [normalize('CS Ávila Norte')],
      id: 'other',
      isInternal: false,
      key: normalize('CS Ávila Norte'),
      name: 'CS Ávila Norte'
    });
    expect(() => buildPlan(source, ['CS Ávila Norte'])).toThrow('Conflicting');
  });

  it('rejects a pre-existing alias collision', () => {
    const source = snapshot();
    source.hospitals[1]!.aliasKeys.push(normalize('CS Ávila Norte'));
    source.hospitals[0]!.aliasKeys.push(normalize('CS Ávila Norte'));
    expect(() => buildPlan(source, ['CS Ávila Norte'])).toThrow('Ambiguous');
  });

  it('rejects mismatched parallel group IDs and names', () => {
    const source = snapshot();
    source.group.hospitals = ['Different centre'];
    expect(() => buildPlan(source, [])).toThrow('inconsistent');
  });
});
