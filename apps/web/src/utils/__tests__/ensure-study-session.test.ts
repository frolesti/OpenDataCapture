import type { Session } from '@opendatacapture/schemas/session';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureStudySession } from '../ensure-study-session';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: (error: unknown) => Boolean(error && typeof error === 'object' && 'isAxiosError' in error)
  }
}));

const now = new Date();
const session: Session = {
  id: 'session',
  createdAt: now,
  updatedAt: now,
  date: now,
  groupId: 'orion',
  subjectId: 'ORION$investigator',
  subject: {
    id: 'ORION$investigator',
    createdAt: now,
    updatedAt: now,
    groupIds: ['orion']
  },
  userId: 'investigator',
  type: 'RETROSPECTIVE'
};
const context = {
  session,
  group: { id: 'orion', name: 'ORION' },
  user: { id: 'investigator', username: 'investigator' }
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: { groupId: 'orion', subjectId: session.subjectId } });
  vi.mocked(axios.post).mockResolvedValue({ data: { ...session, id: 'renewed' } });
});

describe('recovering an invalid study session without resending the record', () => {
  it('reuses a valid accessible session', async () => {
    expect(await ensureStudySession(context)).toBe(session);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('renews an inaccessible legacy or deleted session for the same investigator and study', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    expect((await ensureStudySession(context)).id).toBe('renewed');
    expect(axios.post).toHaveBeenCalledWith(
      '/v1/sessions',
      expect.objectContaining({
        groupId: 'orion',
        subjectData: { id: session.subjectId },
        type: 'RETROSPECTIVE'
      }),
      { suppressErrorNotification: true }
    );
  });

  it('renews an accessible legacy session missing its study link', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { groupId: null, subjectId: session.subjectId } });
    expect((await ensureStudySession(context)).id).toBe('renewed');
  });

  it.each([401, 403, 500])('does not retry a session check with HTTP %s', async (status) => {
    const error = { isAxiosError: true, response: { status } };
    vi.mocked(axios.get).mockRejectedValueOnce(error);
    await expect(ensureStudySession(context)).rejects.toBe(error);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('never recreates a different participant’s session', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(ensureStudySession({ ...context, user: { id: 'other', username: 'other' } })).rejects.toBeDefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects a session from another group without renewing it', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { groupId: 'omega', subjectId: session.subjectId } });
    await expect(ensureStudySession(context)).rejects.toThrow('no correspon');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('validates the renewed session instead of treating malformed data as success', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { ...session, userId: 'other' } });
    await expect(ensureStudySession(context)).rejects.toThrow('no correspon');
  });
});
