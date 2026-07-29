import { useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  Button,
  Checkbox,
  Dialog,
  Heading,
  Input,
  Label,
  Separator
} from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

import {
  deserializeHospital,
  formatHospitalLabel,
  type HospitalMetadata,
  normalizeHospitals,
  serializeHospital
} from './hospitals';

type GroupHospitalManagerProps = {
  hospitals: string[];
  knownHospitals?: string[];
  onHospitalsChange: (hospitals: string[]) => void;
};

type FormDialogState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; original: string };

const EMPTY_DRAFT: HospitalMetadata = {
  locality: '',
  name: '',
  province: '',
  state: ''
};

export const GroupHospitalManager = ({
  hospitals,
  knownHospitals = [],
  onHospitalsChange
}: GroupHospitalManagerProps) => {
  const { t } = useTranslation();

  const [formDialog, setFormDialog] = useState<FormDialogState>({ mode: 'closed' });
  const [draft, setDraft] = useState<HospitalMetadata>(EMPTY_DRAFT);

  const [isExistingOpen, setIsExistingOpen] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState<string[]>([]);

  const [pendingDelete, setPendingDelete] = useState<null | string>(null);

  const hospitalLabels = useMemo(
    () => hospitals.map((hospital) => ({ hospital, label: formatHospitalLabel(hospital) })),
    [hospitals]
  );

  const catalogOptions = useMemo(() => {
    const alreadyAdded = new Set(hospitals);
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const raw of knownHospitals) {
      const trimmed = raw.trim();
      if (!trimmed || alreadyAdded.has(trimmed) || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      options.push({ label: formatHospitalLabel(trimmed), value: trimmed });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [hospitals, knownHospitals]);

  useEffect(() => {
    if (formDialog.mode === 'closed') {
      setDraft(EMPTY_DRAFT);
    }
  }, [formDialog.mode]);

  useEffect(() => {
    if (!isExistingOpen) {
      setSelectedExisting([]);
    }
  }, [isExistingOpen]);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setFormDialog({ mode: 'create' });
  };

  const openEdit = (raw: string) => {
    const metadata = deserializeHospital(raw);
    setDraft({
      locality: metadata.locality ?? '',
      name: metadata.name,
      province: metadata.province ?? '',
      state: metadata.state ?? ''
    });
    setFormDialog({ mode: 'edit', original: raw });
  };

  const closeFormDialog = () => setFormDialog({ mode: 'closed' });

  const handleSaveFormDialog = () => {
    const serialized = serializeHospital(draft);
    if (!serialized) return;
    if (formDialog.mode === 'edit') {
      const next = hospitals.map((value) => (value === formDialog.original ? serialized : value));
      onHospitalsChange(normalizeHospitals(next));
    } else if (formDialog.mode === 'create') {
      onHospitalsChange(normalizeHospitals([...hospitals, serialized]));
    }
    closeFormDialog();
  };

  const toggleExisting = (value: string) => {
    setSelectedExisting((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
    );
  };

  const handleSaveExisting = () => {
    if (!selectedExisting.length) return;
    onHospitalsChange(normalizeHospitals([...hospitals, ...selectedExisting]));
    setIsExistingOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onHospitalsChange(hospitals.filter((hospital) => hospital !== pendingDelete));
    setPendingDelete(null);
  };

  return (
    <section className="mt-6 grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading variant="h4">{t({ en: 'Hospitals', fr: 'Hospitales' })}</Heading>
          <p className="text-muted-foreground text-sm">
            {t({
              en: "Fes clic al nom per editar l'hospital o a la creu per eliminar-lo.",
              fr: 'Haz clic en el nombre para editar el hospital o en la cruz para eliminarlo.'
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" type="button" variant="outline" onClick={() => setIsExistingOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {t({ en: 'Afegeix existent', fr: 'Añadir existente' })}
          </Button>
          <Button className="gap-2" type="button" variant="outline" onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            {t({ en: 'Crea nou', fr: 'Crear nuevo' })}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {hospitalLabels.length ? (
          hospitalLabels.map(({ hospital, label }) => (
            <div
              key={hospital}
              className="bg-background flex max-w-full items-stretch overflow-hidden rounded-full border"
            >
              <button
                aria-label={t({ en: 'Edita', fr: 'Editar' })}
                className="hover:bg-muted min-w-0 cursor-pointer whitespace-normal break-words px-3 py-1.5 text-left text-sm"
                type="button"
                onClick={() => openEdit(hospital)}
              >
                {label}
              </button>
              <button
                aria-label={t({ en: 'Elimina', fr: 'Eliminar' })}
                className="hover:bg-destructive hover:text-destructive-foreground flex cursor-pointer items-center border-l px-2 py-1.5"
                type="button"
                onClick={() => setPendingDelete(hospital)}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">
            {t({ en: 'Encara no hi ha hospitals afegits.', fr: 'Todavía no hay hospitales añadidos.' })}
          </p>
        )}
      </div>

      <Separator className="mt-4" />

      {/* Dialog: add existing hospitals (multi-select) */}
      <Dialog
        open={isExistingOpen}
        onOpenChange={(open) => {
          setIsExistingOpen(open);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Afegir hospitals existents', fr: 'Añadir hospitales existentes' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: 'Selecciona un o més hospitals dels altres grups per afegir-los a aquest grup.',
                fr: 'Selecciona uno o más hospitales de otros grupos para añadirlos a este grupo.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="max-h-72 space-y-2 overflow-y-auto py-2">
            {catalogOptions.length ? (
              catalogOptions.map((option) => {
                const checked = selectedExisting.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="hover:bg-muted flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleExisting(option.value)} />
                    <span className="break-words text-sm">{option.label}</span>
                  </label>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">
                {t({
                  en: 'No hi ha cap hospital disponible per afegir.',
                  fr: 'No hay ningún hospital disponible para añadir.'
                })}
              </p>
            )}
          </div>

          <Dialog.Footer>
            <Button className="min-w-24" type="button" variant="outline" onClick={() => setIsExistingOpen(false)}>
              {t('core.cancel')}
            </Button>
            <Button
              className="min-w-24"
              disabled={selectedExisting.length === 0}
              type="button"
              variant="primary"
              onClick={handleSaveExisting}
            >
              {t({
                en: selectedExisting.length > 1 ? `Afegeix (${selectedExisting.length})` : 'Afegeix',
                fr: selectedExisting.length > 1 ? `Añadir (${selectedExisting.length})` : 'Añadir'
              })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Dialog: create or edit hospital */}
      <Dialog
        open={formDialog.mode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) closeFormDialog();
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              {formDialog.mode === 'edit'
                ? t({ en: "Edita l'hospital", fr: 'Editar hospital' })
                : t({ en: 'Nou hospital', fr: 'Nuevo hospital' })}
            </Dialog.Title>
            <Dialog.Description>
              {formDialog.mode === 'edit'
                ? t({
                    en: 'Modifica les dades i desa els canvis.',
                    fr: 'Modifica los datos y guarda los cambios.'
                  })
                : t({
                    en: 'Omple les dades del centre sanitari.',
                    fr: 'Rellena los datos del centro sanitario.'
                  })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="hospital-name">
                {t({ en: 'Nom del centre sanitari', fr: 'Nombre del centro sanitario' })}
              </Label>
              <Input
                autoComplete="off"
                id="hospital-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hospital-locality">{t({ en: 'Localitat (opcional)', fr: 'Localidad (opcional)' })}</Label>
              <Input
                autoComplete="off"
                id="hospital-locality"
                value={draft.locality ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, locality: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hospital-province">{t({ en: 'Província (opcional)', fr: 'Provincia (opcional)' })}</Label>
              <Input
                autoComplete="off"
                id="hospital-province"
                value={draft.province ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, province: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hospital-state">{t({ en: 'Estat (opcional)', fr: 'Estado (opcional)' })}</Label>
              <Input
                autoComplete="off"
                id="hospital-state"
                value={draft.state ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
              />
            </div>
          </div>

          <Dialog.Footer>
            <Button className="min-w-24" type="button" variant="outline" onClick={closeFormDialog}>
              {t('core.cancel')}
            </Button>
            <Button className="min-w-24" type="button" variant="primary" onClick={handleSaveFormDialog}>
              {t('core.save')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Confirmation dialog for delete */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>{t({ en: "Elimina l'hospital", fr: 'Eliminar hospital' })}</AlertDialog.Title>
            <AlertDialog.Description>
              {pendingDelete
                ? t({
                    en: `Segur que vols eliminar "${formatHospitalLabel(pendingDelete)}" del grup?`,
                    fr: `¿Seguro que quieres eliminar "${formatHospitalLabel(pendingDelete)}" del grupo?`
                  })
                : ''}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>{t('core.cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={confirmDelete}
            >
              {t({ en: 'Elimina', fr: 'Eliminar' })}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </section>
  );
};
