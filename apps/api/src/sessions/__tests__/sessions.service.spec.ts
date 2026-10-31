import { getModelToken, LoggingService, PRISMA_CLIENT_TOKEN } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupsService } from '../../groups/groups.service';
import { SubjectsService } from '../../subjects/subjects.service';
import { SessionsService } from '../sessions.service';

describe('study session group linkage', () => {
  let service: SessionsService;
  let sessions: MockedInstance<Model<'Session'>>;
  let subjects: MockedInstance<SubjectsService>;
  let groups: MockedInstance<GroupsService>;
  const input = {
    date: new Date(),
    groupId: 'orion',
    subjectData: { id: 'ORION$investigator' },
    type: 'RETROSPECTIVE' as const,
    username: 'investigator'
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        MockFactory.createForModelToken(getModelToken('Session')),
        MockFactory.createForService(GroupsService),
        MockFactory.createForService(SubjectsService),
        MockFactory.createForService(LoggingService),
        { provide: PRISMA_CLIENT_TOKEN, useValue: { user: { findFirst: vi.fn(async () => ({ id: 'investigator' })) } } }
      ]
    }).compile();
    service = module.get(SessionsService);
    sessions = module.get(getModelToken('Session'));
    subjects = module.get(SubjectsService);
    groups = module.get(GroupsService);
    groups.findById.mockResolvedValue({ id: 'orion' });
    subjects.findById.mockResolvedValue({ id: input.subjectData.id, groupIds: ['orion'] });
    sessions.create.mockResolvedValue({ id: 'session' });
    sessions.findUnique.mockResolvedValue({ id: 'session' });
  });

  it('links the study even when the participant already belongs to it', async () => {
    await service.create(input);
    expect(sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ group: { connect: { id: 'orion' } }, user: { connect: { id: 'investigator' } } })
    });
    expect(subjects.addGroupForSubject).not.toHaveBeenCalled();
  });

  it('adds membership and links the study for a participant not yet assigned', async () => {
    subjects.findById.mockResolvedValue({ id: input.subjectData.id, groupIds: [] });
    await service.create(input);
    expect(subjects.addGroupForSubject).toHaveBeenCalledWith(input.subjectData.id, 'orion');
    expect(sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ group: { connect: { id: 'orion' } } })
    });
  });

  it('keeps ungrouped sessions working', async () => {
    await service.create({ ...input, groupId: null });
    expect(groups.findById).not.toHaveBeenCalled();
    expect(sessions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ group: undefined }) });
  });

  it('propagates denied group access before creating a participant or session', async () => {
    groups.findById.mockRejectedValueOnce(new Error('group access denied'));
    await expect(service.create(input)).rejects.toThrow('group access denied');
    expect(subjects.findById).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
