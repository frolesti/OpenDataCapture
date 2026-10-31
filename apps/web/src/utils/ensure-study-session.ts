import { $Session } from '@opendatacapture/schemas/session';
import type { Session } from '@opendatacapture/schemas/session';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import axios from 'axios';

type StudySessionContext = {
  session: Session;
  group: { id: string; name: string } | null;
  user: { id: string; username: string } | null;
};

export async function ensureStudySession({ session, group, user }: StudySessionContext): Promise<Session> {
  const subjectId = group && user ? encodeScopedSubjectId(user.username, { groupName: group.name }) : null;
  const canRenew = Boolean(
    group && user && session.subject.id === subjectId && (!session.userId || session.userId === user.id)
  );
  try {
    const response = await axios.get<Pick<Session, 'groupId' | 'subjectId'>>(`/v1/sessions/${session.id}`, {
      suppressErrorNotification: true
    });
    if (response.data.groupId === (group?.id ?? null) && response.data.subjectId === session.subject.id) {
      return session;
    }
    if (!canRenew || response.data.groupId !== null || response.data.subjectId !== subjectId) {
      throw new Error('La sessió no correspon al participant i a l’estudi seleccionats.');
    }
  } catch (error) {
    if (!canRenew || !axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }
  }

  if (!group || !user || !subjectId) {
    throw new Error('No es pot recuperar la sessió sense un estudi i un usuari vàlids.');
  }
  const response = await axios.post(
    '/v1/sessions',
    {
      date: new Date(),
      groupId: group.id,
      subjectData: { id: subjectId },
      type: 'RETROSPECTIVE',
      username: user.username
    },
    { suppressErrorNotification: true }
  );
  const renewed = $Session.parse(response.data);
  if (renewed.groupId !== group.id || renewed.subjectId !== subjectId || renewed.userId !== user.id) {
    throw new Error('La sessió recuperada no correspon a l’usuari i a l’estudi seleccionats.');
  }
  return renewed;
}
