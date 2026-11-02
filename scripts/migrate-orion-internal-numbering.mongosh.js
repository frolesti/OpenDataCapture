const database = db.getSiblingDB('data-capture-production');
const groupId = ObjectId('6a6c742bfa3acff8e0769bc1');
const internalUsernames = ['admin', 'amunyoz', 'aramirez', 'ctorres'];
const externalUsernames = ['aalcantara', 'anavarro', 'mtorres'];
const recordIds = ['6ae76bd594b1444d990aba75', '6ae76c1994b1444d990aba79'].map((id) => ObjectId(id));
const oldIndex = 'OrionInvestigatorModel_groupId_number_key';
const newIndex = 'OrionInvestigatorModel_groupId_isInternal_number_key';
const crypto = require('node:crypto');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function hashRecords(target, filter) {
  const hash = crypto.createHash('sha256');
  for await (const record of target.InstrumentRecordModel.find(filter).sort({ _id: 1 })) {
    hash.update(EJSON.stringify(record));
  }
  return hash.digest('hex');
}

async function plan(target) {
  const users = await target.UserModel.find({
    username: { $in: [...internalUsernames, ...externalUsernames] }
  }).toArray();
  check(users.length === 7, 'Expected exactly the seven confirmed accounts');
  const alta = await target.HospitalModel.findOne({ _id: ObjectId('e5bb1c946b78c0156aa25994') });
  check(alta?.isInternal === true, 'Alta hospital is not marked internal');
  const assignments = await target.OrionInvestigatorModel.find({ groupId }).sort({ number: 1 }).toArray();
  check(assignments.length === 8, 'Investigator allocations changed; review before migration');
  const expected = ['aalcantara', 'anavarro', 'admin', 'amunyoz', 'aramirez', 'ctorres', null, 'mtorres'];
  for (let i = 0; i < assignments.length; i++) {
    const row = assignments[i];
    check(Number(row.number) === i + 1 && row.isInternal !== true, 'Existing numbering changed');
    const owner = await target.UserModel.findOne({ _id: row.investigatorId });
    check((owner?.username ?? null) === expected[i], 'Allocation owner changed');
  }
  const updates = [];
  for (const username of [...internalUsernames, ...externalUsernames]) {
    const isInternal = internalUsernames.includes(username);
    const number = (isInternal ? internalUsernames : externalUsernames).indexOf(username) + 1;
    const user = users.find((entry) => entry.username === username);
    const centre = (user.studyHospitals ?? []).find((entry) => String(entry.groupId) === String(groupId));
    check(
      centre && (String(centre.hospitalId) === String(alta._id)) === isInternal,
      `Unexpected study centre: ${username}`
    );
    const allocation = assignments.find((entry) => String(entry.investigatorId) === String(user._id));
    updates.push({ id: allocation._id, username, isInternal, number });
  }
  const records = await target.InstrumentRecordModel.find({ _id: { $in: recordIds } }).toArray();
  check(records.length === 2, 'The two approved records are missing or already deleted');
  const anna = users.find((entry) => entry.username === 'amunyoz');
  for (const record of records) {
    check(String(record.groupId) === String(groupId), 'Approved record study changed');
    check((record.data?.patient_code ?? record.data?.user_code) === 'OR-04-01', 'Approved record code changed');
    const session = await target.SessionModel.findOne({ _id: record.sessionId });
    check(session && String(session.userId) === String(anna._id), 'Approved record owner changed');
  }
  check(
    (await target.InstrumentRecordModel.countDocuments({ groupId })) === 2,
    'Other ORION responses exist; aborting renumbering'
  );
  const codes = await target.OrionPatientCodeModel.find({ groupId }).toArray();
  check(
    codes.length === 1 && codes[0].code === 'OR-04-01' && String(codes[0].investigatorId) === String(anna._id),
    'Patient code allocations changed'
  );
  const reminders = await target.OrionFollowupReminderModel.find({ userCode: 'OR-04-01' }).toArray();
  check(
    reminders.length === 1 &&
      recordIds.some((id) => String(id) === String(reminders[0].selectionRecordId)) &&
      recordIds.some((id) => String(id) === String(reminders[0].followupRecordId)),
    'Linked reminder changed'
  );
  return {
    updates,
    orphanId: assignments[6]._id,
    codeId: codes[0]._id,
    reminderId: reminders[0]._id,
    responseCount: await target.InstrumentRecordModel.countDocuments(),
    preservedResponseHash: await hashRecords(target, { _id: { $nin: recordIds } }),
    usersHash: crypto
      .createHash('sha256')
      .update(EJSON.stringify(await target.UserModel.find().sort({ _id: 1 }).toArray()))
      .digest('hex'),
    formHash: crypto
      .createHash('sha256')
      .update(EJSON.stringify(await target.InstrumentModel.find().sort({ _id: 1 }).toArray()))
      .digest('hex')
  };
}

async function verify(target, before) {
  check(
    (await target.InstrumentRecordModel.countDocuments()) === before.responseCount - 2,
    'Unexpected response count'
  );
  check((await hashRecords(target, {})) === before.preservedResponseHash, 'Unrelated responses changed');
  check((await target.OrionPatientCodeModel.countDocuments({ groupId })) === 0, 'ORION patient codes remain');
  check((await target.OrionFollowupReminderModel.countDocuments({ _id: before.reminderId })) === 0, 'Reminder remains');
  check((await target.OrionInvestigatorModel.countDocuments({ groupId })) === 7, 'Unexpected allocation count');
  for (const entry of before.updates) {
    const row = await target.OrionInvestigatorModel.findOne({ _id: entry.id });
    check(
      Number(row.number) === entry.number && row.isInternal === entry.isInternal,
      `Wrong new numbering: ${entry.username}`
    );
  }
  check(
    crypto
      .createHash('sha256')
      .update(EJSON.stringify(await target.UserModel.find().sort({ _id: 1 }).toArray()))
      .digest('hex') === before.usersHash,
    'Accounts changed'
  );
  check(
    crypto
      .createHash('sha256')
      .update(EJSON.stringify(await target.InstrumentModel.find().sort({ _id: 1 }).toArray()))
      .digest('hex') === before.formHash,
    'Published forms changed'
  );
}

async function main() {
  const before = await plan(database);
  print(EJSON.stringify({ mode: process.env.APPLY_ORION_INTERNAL === 'yes' ? 'apply' : 'dry-run', ...before }));
  if (process.env.APPLY_ORION_INTERNAL !== 'yes') return;
  check(process.env.ORION_API_STOPPED === 'yes', 'Stop API writes before applying this migration');
  await database.OrionInvestigatorModel.createIndex(
    { groupId: 1, isInternal: 1, number: 1 },
    { name: newIndex, unique: true }
  );
  const indexes = await database.OrionInvestigatorModel.getIndexes();
  check(
    indexes.some((index) => index.name === oldIndex),
    'Expected original numbering index is missing'
  );
  await database.OrionInvestigatorModel.dropIndex(oldIndex);
  const updatedIndexes = await database.OrionInvestigatorModel.getIndexes();
  check(
    updatedIndexes.some((index) => index.name === newIndex && index.unique === true),
    'Separate numbering index is missing'
  );
  check(
    !updatedIndexes.some((index) => index.unique && index.key.groupId && index.key.number && !index.key.isInternal),
    'An old shared numbering constraint remains'
  );
  const session = db.getMongo().startSession();
  try {
    session.startTransaction();
    const target = session.getDatabase(database.getName());
    check(EJSON.stringify(await plan(target)) === EJSON.stringify(before), 'Production changed after preflight');
    await target.OrionInvestigatorModel.updateMany({ isInternal: { $exists: false } }, { $set: { isInternal: false } });
    for (const entry of before.updates) {
      await target.OrionInvestigatorModel.updateOne(
        { _id: entry.id },
        { $set: { isInternal: entry.isInternal, number: entry.number } }
      );
    }
    await target.OrionInvestigatorModel.deleteOne({ _id: before.orphanId });
    await target.InstrumentRecordModel.deleteMany({ _id: { $in: recordIds } });
    await target.OrionPatientCodeModel.deleteOne({ _id: before.codeId });
    await target.OrionFollowupReminderModel.deleteOne({ _id: before.reminderId });
    await verify(target, before);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  await verify(database, before);
  print(
    JSON.stringify({
      verified: true,
      remainingResponses: before.responseCount - 2,
      preservedResponseHash: before.preservedResponseHash
    })
  );
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  quit(1);
});
