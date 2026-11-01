import { Label, Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { $ProfessionalTitle, type ProfessionalTitle } from '@opendatacapture/schemas/user';

export function ProfessionalTitleField({
  id,
  onValueChange,
  value,
  showDescription = true
}: {
  id: string;
  onValueChange: (value: ProfessionalTitle) => void;
  value: ProfessionalTitle | '';
  showDescription?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{t({ en: 'Tractament professional', fr: 'Tratamiento profesional' })}</Label>
      <Select value={value} onValueChange={(next) => onValueChange($ProfessionalTitle.parse(next))}>
        <Select.Trigger id={id}>
          <Select.Value placeholder={t({ en: 'Selecciona Dr. o Dra.', fr: 'Selecciona Dr. o Dra.' })} />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="Dr">Dr.</Select.Item>
          <Select.Item value="Dra">Dra.</Select.Item>
        </Select.Content>
      </Select>
      {showDescription ? (
        <p className="text-muted-foreground text-xs">
          {t({
            en: 'Cal confirmar el tractament abans de crear el compte i enviar les credencials. No es dedueix del nom.',
            fr: 'Debe confirmar el tratamiento antes de crear la cuenta y enviar las credenciales. No se deduce del nombre.'
          })}
        </p>
      ) : null}
    </div>
  );
}
