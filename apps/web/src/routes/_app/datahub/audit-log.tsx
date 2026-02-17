import React, { useEffect, useRef, useState } from 'react';

import { toBasicISOString } from '@douglasneuroinformatics/libjs';
import { Button, ClientTable, Heading, Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store';
import { useSubjectsQuery } from '@/hooks/useSubjectsQuery';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';

const SelectTrigger = Select.Trigger as unknown as React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
const SelectContent = Select.Content as unknown as React.ComponentType<React.PropsWithChildren<unknown>>;
const SelectItem = Select.Item as unknown as React.ComponentType<React.PropsWithChildren<{ value: string }>>;

type AuditFieldChange = {
  field: string;
  newValue?: string;
  oldValue?: string;
};

type AuditLogEntry = {
  changes: AuditFieldChange[];
  changedCount?: number;
  compactChanges?: Record<string, { old?: string; new?: string }>;
  createdAt: string;
  fields?: string[];
  id: string;
  instrumentId: string;
  recordId: string;
  subjectId: string;
  patientCode?: string;
  userId: string;
  username: string;
};

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentUser = useAppStore((store) => store.currentUser);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterUser, setFilterUser] = useState<string>('ALL');

  const { data: subjects } = useSubjectsQuery({ params: { groupId: currentGroup?.id } });
  const { data: instrumentInfos } = useInstrumentInfoQuery();

  // Only admins and group managers can see this page
  const isAdmin = currentUser?.basePermissionLevel === 'ADMIN';
  const isGroupManager = currentUser?.basePermissionLevel === 'GROUP_MANAGER';
  const canViewAudit = isAdmin || isGroupManager;

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!canViewAudit) {
      void navigate({ to: '/datahub' });
      return;
    }

    if (fetchedRef.current) return; // avoid duplicate fetches (React strict/dev double-mount)
    fetchedRef.current = true;

    const fetchAuditLogs = async () => {
      try {
        const response = await axios.get<AuditLogEntry[]>('/v1/audit-log', {
          params: {
            groupId: currentGroup?.id
          }
        });
        setAuditLogs(response.data);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAuditLogs();
  }, [canViewAudit, currentGroup?.id]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get unique usernames for filter
  const uniqueUsers = Array.from(new Set(auditLogs.map((log) => log.username)));

  const filteredLogs = filterUser === 'ALL' ? auditLogs : auditLogs.filter((log) => log.username === filterUser);

  // Single subject map containing all useful label forms for each subject.
  // - display: human-friendly fallback (title || fullName || unscoped id)
  // - code: site-specific patient code (codigoPaciente or patientID)
  const subjectMap = React.useMemo(() => {
    const m: Record<string, { display: string; code?: string }> = {};
    (subjects ?? []).forEach((s: any) => {
      const title = s?.details?.title as string | undefined;
      const patientCode = s?.data?.codigoPaciente ?? s?.data?.patientID ?? undefined;
      const fullName = s?.firstName && s?.lastName ? `${s.firstName} ${s.lastName}` : undefined;
      const unscoped = s.id ? removeSubjectIdScope(s.id) : s.id;
      const display = title || patientCode || fullName || unscoped || '';
      m[s.id] = { display, code: patientCode };
    });
    return m;
  }, [subjects]);

  const instrumentMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    (instrumentInfos ?? []).forEach((i: any) => {
      m[i.id] = i.clientDetails?.title ?? i.details?.title ?? i.id;
    });
    return m;
  }, [instrumentInfos]);
  // Helper to extract patient code from compact response shape.
  const getPatientCodeFromLog = React.useCallback((log: AuditLogEntry) => {
    if (!log) return undefined;
    // API now returns `patientCode` directly when available.
    if (log.patientCode) return log.patientCode;
    // If compactChanges include codigoPaciente (changed), prefer the new value.
    const cc = log.compactChanges as any | undefined;
    if (cc?.codigoPaciente?.new) return cc.codigoPaciente.new;
    if (cc?.codigoPaciente?.old) return cc.codigoPaciente.old;
    if (cc?.patientID?.new) return cc.patientID.new;
    if (cc?.patientID?.old) return cc.patientID.old;
    return undefined;
  }, []);

  if (!canViewAudit) {
    return null;
  }

  return (
    <React.Fragment>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: 'Registre de canvis',
            fr: 'Registro de cambios'
          } as any)}
        </Heading>
      </PageHeader>
      <div className="flex grow flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button className="gap-2" variant="outline" onClick={() => void navigate({ to: '/datahub' })}>
            <ArrowLeft className="h-4 w-4" />
            {t({
              en: 'Tornar al centre de dades',
              fr: 'Volver al centro de datos'
            } as any)}
          </Button>
          <div className="flex gap-2">
            {uniqueUsers.length > 1 && (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="min-w-40">
                  <Select.Value
                    placeholder={t({
                      en: 'Filtrar per usuari',
                      fr: 'Filtrar por usuario'
                    } as any)}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t({
                      en: 'Tots els usuaris',
                      fr: 'Todos los usuarios'
                    } as any)}
                  </SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex grow items-center justify-center">
            <p className="text-muted-foreground">
              {t({
                en: 'Carregant...',
                fr: 'Cargando...'
              } as any)}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex grow flex-col items-center justify-center gap-2 text-slate-500">
            <p>
              {t({
                en: 'No hi ha registres de canvis',
                fr: 'No hay registros de cambios'
              } as any)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              return (
                <div key={log.id} className="border-border overflow-hidden rounded-lg border">
                  {/* Summary row */}
                  <button
                    className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left transition-colors"
                    onClick={() => toggleRow(log.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                    )}
                    <div className="grid min-w-0 grow grid-cols-1 gap-2 sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">
                          {t({
                            en: 'Data',
                            fr: 'Fecha'
                          } as any)}
                        </span>
                        <p className="truncate text-sm">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">
                          {t({
                            en: 'Usuari',
                            fr: 'Usuario'
                          } as any)}
                        </span>
                        <p className="truncate text-sm font-medium">{log.username}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">
                          {t({
                            en: 'Instrument',
                            fr: 'Instrumento'
                          } as any)}
                        </span>
                        <p className="truncate text-sm">{instrumentMap[log.instrumentId] ?? log.instrumentId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">
                          {t({
                            en: 'Camps modificats',
                            fr: 'Campos modificados'
                          } as any)}
                        </span>
                        <p className="text-sm">
                          <span className="inline-flex h-5 items-center rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {log.changes.length}
                          </span>
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-border border-t px-4 pb-4 pt-3">
                      <p className="text-muted-foreground mb-3 text-xs">
                        {t({ en: 'Pacient', fr: 'Paciente' } as any)}:{' '}
                        {log.patientCode ??
                          getPatientCodeFromLog(log) ??
                          subjectMap[log.subjectId]?.code ??
                          subjectMap[log.subjectId]?.display ??
                          removeSubjectIdScope(log.subjectId) ??
                          log.subjectId}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-border border-b">
                              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium">
                                {t({
                                  en: 'Camp',
                                  fr: 'Campo'
                                } as any)}
                              </th>
                              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium">
                                {t({
                                  en: 'Valor anterior',
                                  fr: 'Valor anterior'
                                } as any)}
                              </th>
                              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium">
                                {t({
                                  en: 'Valor nou',
                                  fr: 'Valor nuevo'
                                } as any)}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.changes.map((change, idx) => (
                              <tr key={idx} className="border-border border-b last:border-0">
                                <td className="px-3 py-2 font-mono text-xs font-medium">{change.field}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-block max-w-xs truncate rounded bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                    {change.oldValue ?? '—'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-block max-w-xs truncate rounded bg-green-50 px-2 py-0.5 font-mono text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                    {change.newValue ?? '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export const Route = createFileRoute('/_app/datahub/audit-log')({
  component: RouteComponent
});
