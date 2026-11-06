/* global db, EJSON, ObjectId, exit */
// Pipe this file to mongosh --quiet data-capture-production --file /dev/stdin.
// The default is a read-only preview; review its planHash before applying.
// Applying requires OMEGA_JOIN_APPLY=1, OMEGA_JOIN_EXPECTED_HASH and OMEGA_JOIN_BACKUP_PATH.
// Backups must be in the persistent /data/configdb/ volume and are created exclusively.
// Existing IDs and clinical records are never rewritten; canonical names retain legacy alias keys.
const GROUP_ID = '68f79fe940f145952ad9de69';

const LEGACY_NAMES = [
  'CAP Badia',
  'CAP Numància',
  'CAP Sant Martí',
  'CAP Manso',
  'CS Acea da Ma',
  'CS Aravaca',
  'CS Xunqueira de Ambía',
  'CS Villoria',
  'CS Tórtola',
  'CS Ávila Norte',
  'CS Casco Vello',
  'Consultorio de Jayena',
  'CS Ribadavia',
  'CS Arturo Eyries',
  'CS Ensanche de Vallecas',
  'CS Vinaròs',
  'CS Monforte de Lemos',
  'CS José Aguado',
  'Consultorio de Villaobispo de las Regueras (León)',
  'UGC Aguadulce - El Parador',
  'CS Cartaya',
  'CS Fuencarral',
  'CS Brújula',
  'Consultorio Local Fontanars Dels Alforins',
  'CS María Fuensanta Pérez Quirós',
  'CS Santa Marta de Tormes',
  'CS A Ponte',
  'CS V Centenario',
  'CS Sector III',
  "Consultori La Platja d'Almenara",
  'CS de La Eliana',
  'CAP Sant Llàtzer'
];

const ALIASES = new Map([
  ['CAP Badia', 'CAP Badia (Barcelona)'],
  ['CAP Manso', 'CAP Manso (Barcelona)'],
  ['CAP Numància', 'CAP Numància (Barcelona)'],
  ['CAP Sant Llàtzer', 'CAP Sant Llàtzer CST'],
  ['CAP Sant Martí', 'CAP Sant Martí|||Barcelona|||Barcelona|||Espanya'],
  ['CAP Sant Martí (Barcelona)', 'CAP Sant Martí|||Barcelona|||Barcelona|||Espanya'],
  // The catalogue owner confirmed this combined Almenara/Chilches identity.
  ["Consultori La Platja d'Almenara", 'Centro Auxiliar Playa Almenara y Centro Auxiliar Playa Chilches'],
  ['Consultorio de Jayena', 'Consultorio de Jayena (Z. B. S. Alhama de Granada)'],
  ['Consultorio Local Fontanars Dels Alforins', 'Fontanars dels Alforins - Departamento de salud Xàtiva-Ontinyent'],
  ['CS Acea da Ma', 'CS Acea da Ma (A Coruña)'],
  ['CS A Ponte', 'CS A Ponte (Ourense)'],
  ['CS Arturo Eyries', 'CS Arturo Eyries (Valladolid)'],
  ['CS Ávila Norte', 'CS Ávila Norte (Ávila)'],
  ['CS Cartaya', 'CS Cartaya-Huelva'],
  ['CS Casco Vello', 'CS Casco Vello (Vigo)'],
  ['CS de La Eliana', "CS L'Eliana"],
  ['CS Ensanche (Vallecas)', 'CS Ensanche de Vallecas (Madrid)'],
  ['CS María Fuensanta Pérez Quirós', 'Centro de salud María Fuensanta Pérez Quirós (SAS)'],
  ['CS Maria Fuensanta Pérez Quirós (Sevilla)', 'Centro de salud María Fuensanta Pérez Quirós (SAS)'],
  ['CS Monforte de Lemos', 'CS Monforte de Lemos (Lugo)'],
  ['CS Ribadavia', 'CS Ribadavia (Ourense)'],
  ['CS Santa Marta de Tormes', 'CS Santa Marta de Tormes (Salamanca)'],
  ['CS Sector III', 'CS Sector III, Getafe (Madrid)'],
  ['CS Tórtola', 'CS Tórtola (Valladolid)'],
  ['CS V Centenario', 'CS V Centenario (Madrid)'],
  ['CS Villoria', 'CS Villoria (Salamanca)'],
  ['CS Xunqueira de Ambía', 'CS Xunqueira de Ambia (Ourense)']
]);

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bc\s*\.\s*s\b\.?|\bcs\b\.?/g, 'cs')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildPlan({ group, hospitals, recordNames }, legacyNames = LEGACY_NAMES) {
  const catalogue = hospitals.map((hospital) => ({
    ...hospital,
    aliasKeys: [...new Set([hospital.key, ...(hospital.aliasKeys ?? [])])]
  }));
  const lookup = (key) => catalogue.filter((hospital) => hospital.key === key || hospital.aliasKeys.includes(key));
  const members = group.hospitalIds.map((id, index) => {
    const hospital = catalogue.find((entry) => entry.id === id);
    if (!hospital || hospital.name !== group.hospitals[index]) {
      throw new Error('OMEGA hospital IDs and names are inconsistent');
    }
    return hospital;
  });
  if (group.hospitals.length !== members.length || new Set(group.hospitalIds).size !== members.length) {
    throw new Error('OMEGA hospital membership is inconsistent');
  }
  const sources = [...new Set([...legacyNames, ...recordNames])];
  for (const name of sources) {
    if (typeof name !== 'string' || !normalize(name)) throw new Error('Invalid source hospital name');
    const key = normalize(name);
    const existing = lookup(key);
    if (existing.length > 1) throw new Error(`Ambiguous hospital alias: ${name}`);
    const target = ALIASES.get(name);
    const matches = target ? lookup(normalize(target)) : existing;
    if (matches.length > 1 || (target && matches.length !== 1)) {
      throw new Error(`Cannot resolve canonical hospital: ${name}`);
    }
    let hospital = matches[0];
    if (existing.length && existing[0] !== hospital) throw new Error(`Conflicting hospital identities: ${name}`);
    if (!hospital) {
      hospital = { aliasKeys: [key], id: null, isInternal: false, key, name };
      catalogue.push(hospital);
    }
    if (!hospital.aliasKeys.includes(key)) hospital.aliasKeys.push(key);
    if (!members.includes(hospital)) members.push(hospital);
  }
  for (const name of sources) {
    if (members.filter((hospital) => hospital.aliasKeys.includes(normalize(name))).length !== 1) {
      throw new Error(`Source hospital not covered uniquely: ${name}`);
    }
  }
  return {
    additions: members.filter((hospital) => !group.hospitalIds.includes(hospital.id)),
    aliasUpdates: members.filter((hospital) => {
      const previous = hospitals.find((entry) => entry.id === hospital.id);
      return previous && hospital.aliasKeys.some((key) => !(previous.aliasKeys || []).includes(key));
    }),
    hospitals: members,
    sourceCount: sources.length
  };
}

async function run(database) {
  const { createHash } = require('node:crypto');
  const { writeFileSync } = require('node:fs');
  const hash = (value) => createHash('sha256').update(EJSON.stringify(value)).digest('hex');
  const readSnapshot = async (connection) => {
    const group = await connection
      .getCollection('GroupModel')
      .findOne({ _id: ObjectId(GROUP_ID) }, { _id: 1, hospitalIds: 1, hospitals: 1, name: 1, updatedAt: 1 });
    if (!group || !/omega/i.test(group.name)) throw new Error('Expected production OMEGA group');
    const hospitals = await connection.getCollection('HospitalModel').find({}).sort({ _id: 1 }).toArray();
    const records = connection.getCollection('InstrumentRecordModel');
    const recordNames = await records.distinct('data.CAP', { groupId: group._id });
    const invalidNames = recordNames.filter((name) => name != null && typeof name !== 'string');
    if (invalidNames.length) throw new Error('OMEGA contains non-string hospital values');
    const fingerprint = createHash('sha256');
    let recordCount = 0;
    for await (const record of records.find({ groupId: group._id }).sort({ _id: 1 })) {
      fingerprint.update(EJSON.stringify(record));
      recordCount++;
    }
    return {
      group: {
        ...group,
        hospitalIds: group.hospitalIds.map((id) => id.toString()),
        id: group._id.toString()
      },
      hospitals: hospitals.map((hospital) => ({ ...hospital, id: hospital._id.toString() })),
      recordCount,
      recordNames: recordNames.filter((name) => typeof name === 'string').sort(),
      recordsHash: fingerprint.digest('hex')
    };
  };
  const snapshot = await readSnapshot(database);
  const plan = buildPlan(snapshot);
  const planHash = hash({ group: snapshot.group, hospitals: plan.hospitals, recordNames: snapshot.recordNames });
  const summary = {
    additions: plan.additions.map(({ id, name }) => ({ id, name })),
    aliases: plan.aliasUpdates.map(({ aliasKeys, id, name }) => ({ aliasKeys, id, name })),
    group: snapshot.group.name,
    hospitalCount: plan.hospitals.length,
    mode: 'preview',
    planHash,
    previousHospitalCount: snapshot.group.hospitals.length,
    recordCount: snapshot.recordCount,
    recordsHash: snapshot.recordsHash,
    sourceCount: plan.sourceCount
  };
  if (process.env.OMEGA_JOIN_APPLY !== '1') {
    print(JSON.stringify(summary));
    return;
  }
  if (process.env.OMEGA_JOIN_EXPECTED_HASH !== planHash) throw new Error('Preview changed; review a fresh preview');
  const backupPath = process.env.OMEGA_JOIN_BACKUP_PATH;
  if (typeof backupPath !== 'string' || !backupPath.startsWith('/data/configdb/')) {
    throw new Error('A persistent backup path is required');
  }
  writeFileSync(
    backupPath,
    EJSON.stringify({
      group: snapshot.group,
      hospitals: snapshot.hospitals.filter((hospital) => plan.aliasUpdates.some((entry) => entry.id === hospital.id)),
      planHash,
      recordCount: snapshot.recordCount,
      recordsHash: snapshot.recordsHash,
      savedAt: new Date()
    }),
    { flag: 'wx', mode: 0o600 }
  );
  const session = database.getMongo().startSession();
  let appliedHospitals;
  try {
    session.startTransaction({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    try {
      const connection = session.getDatabase(database.getName());
      const current = await readSnapshot(connection);
      const currentPlan = buildPlan(current);
      if (
        hash({ group: current.group, hospitals: currentPlan.hospitals, recordNames: current.recordNames }) !== planHash
      ) {
        throw new Error('OMEGA configuration changed before applying the join');
      }
      if (current.recordsHash !== snapshot.recordsHash || current.recordCount !== snapshot.recordCount) {
        throw new Error('OMEGA records changed before applying; review a fresh preview');
      }
      const otherGroups = await connection
        .getCollection('GroupModel')
        .find({ _id: { $ne: ObjectId(GROUP_ID) } })
        .sort({ _id: 1 })
        .toArray();
      const catalogue = connection.getCollection('HospitalModel');
      for (const hospital of currentPlan.hospitals) {
        if (hospital.id === null) {
          const id = ObjectId();
          await catalogue.insertOne({
            _id: id,
            aliasKeys: hospital.aliasKeys,
            isInternal: hospital.isInternal,
            key: hospital.key,
            name: hospital.name
          });
          hospital.id = id.toString();
        } else if (currentPlan.aliasUpdates.includes(hospital)) {
          await catalogue.updateOne(
            { _id: ObjectId(hospital.id) },
            { $addToSet: { aliasKeys: { $each: hospital.aliasKeys } } }
          );
        }
      }
      const updated = await connection.getCollection('GroupModel').updateOne(
        { _id: ObjectId(GROUP_ID) },
        {
          $set: {
            hospitalIds: currentPlan.hospitals.map((hospital) => ObjectId(hospital.id)),
            hospitals: currentPlan.hospitals.map((hospital) => hospital.name),
            updatedAt: new Date()
          }
        }
      );
      if (updated.matchedCount !== 1) throw new Error('OMEGA group update failed');
      const after = await readSnapshot(connection);
      if (after.recordCount !== current.recordCount || after.recordsHash !== current.recordsHash) {
        throw new Error('OMEGA clinical records changed during reconciliation');
      }
      const otherGroupsAfter = await connection
        .getCollection('GroupModel')
        .find({ _id: { $ne: ObjectId(GROUP_ID) } })
        .sort({ _id: 1 })
        .toArray();
      if (hash(otherGroups) !== hash(otherGroupsAfter)) throw new Error('Another group was modified');
      const check = buildPlan(after);
      if (check.additions.length || check.aliasUpdates.length) throw new Error('Reconciliation is not complete');
      appliedHospitals = currentPlan.hospitals.map(({ id, name }) => ({ id, name }));
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } finally {
    await session.endSession();
  }
  print(JSON.stringify({ ...summary, appliedHospitals, backupPath, mode: 'applied', verified: true }));
}

if (typeof db === 'undefined') {
  module.exports = { buildPlan, LEGACY_NAMES, normalize };
} else {
  run(db).catch((error) => {
    console.error(error);
    exit(1);
  });
}
