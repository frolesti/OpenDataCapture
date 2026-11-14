import { useState } from 'react';

import { Button, Dialog } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { Edit, Trash2 } from 'lucide-react';

import type { TheraDatahubVisit } from '@/utils/thera-datahub';

type StudyVisitActionsProps = {
  canDelete: boolean;
  canEdit: boolean;
  onDelete: (id: string, allVisits: boolean) => void;
  onEdit: (visit: TheraDatahubVisit) => void;
  visits: TheraDatahubVisit[];
};

export function StudyVisitActions({ canDelete, canEdit, onDelete, onEdit, visits }: StudyVisitActionsProps) {
  const [action, setAction] = useState<'delete' | 'edit' | null>(null);
  const { t } = useTranslation();
  const editLabel = t({ en: 'Edita visita', fr: 'Editar visita' });
  const deleteLabel = t({ en: 'Elimina visita', fr: 'Eliminar visita' });

  return (
    <div className="flex items-center gap-1">
      <Button aria-label={editLabel} disabled={!canEdit} size="icon" variant="ghost" onClick={() => setAction('edit')}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        aria-label={deleteLabel}
        disabled={!canDelete}
        size="icon"
        variant="ghost"
        onClick={() => setAction('delete')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{action === 'edit' ? editLabel : deleteLabel}</Dialog.Title>
            <Dialog.Description>{t({ en: 'Selecciona la visita.', fr: 'Seleccione la visita.' })}</Dialog.Description>
          </Dialog.Header>
          <div className="flex flex-col gap-2">
            {visits.map((visit) => (
              <Button
                key={visit.__id__}
                variant="outline"
                onClick={() => {
                  if (action === 'edit') onEdit(visit);
                  else onDelete(visit.__id__, false);
                  setAction(null);
                }}
              >
                {visit.label}
              </Button>
            ))}
            {action === 'delete' && visits[0] && (
              <Button
                variant="danger"
                onClick={() => {
                  onDelete(visits[0]!.__id__, true);
                  setAction(null);
                }}
              >
                {t({ en: 'Elimina totes les visites', fr: 'Eliminar todas las visitas' })}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
