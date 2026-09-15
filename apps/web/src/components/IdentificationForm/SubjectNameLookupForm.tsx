import { useMemo, useState } from 'react';

import { Button, Input } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Subject } from '@opendatacapture/schemas/subject';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import type { Promisable } from 'type-fest';

type SubjectNameLookupFormProps = {
  onSubmit: (data: { id: string }) => Promisable<void>;
  subjects?: Subject[];
};

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const SubjectNameLookupForm = ({ onSubmit, subjects }: SubjectNameLookupFormProps) => {
  const [query, setQuery] = useState('');
  const { t } = useTranslation();

  const matches = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (normalizedQuery.length < 2) {
      return [];
    }
    return (subjects ?? [])
      .filter((subject) => {
        const fullName = normalize(`${subject.firstName ?? ''} ${subject.lastName ?? ''}`.trim());
        const reverseName = normalize(`${subject.lastName ?? ''} ${subject.firstName ?? ''}`.trim());
        return fullName.includes(normalizedQuery) || reverseName.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [query, subjects]);

  return (
    <div className="flex flex-col gap-3" data-testid="subject-name-lookup-form">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="subject-name-lookup-input">
          {t({
            en: 'Nom del subjecte',
            fr: 'Nombre del sujeto'
          })}
        </label>
        <Input
          data-testid="subject-name-lookup-input"
          id="subject-name-lookup-input"
          placeholder={t({
            en: 'Escriviu el nom o cognoms…',
            fr: 'Escriba el nombre o apellidos…'
          })}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {query.trim().length >= 2 && matches.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t({
              en: "No s'ha trobat cap subjecte amb aquest nom",
              fr: 'No se encontró ningún sujeto con ese nombre'
            })}
          </p>
        )}
        {matches.map((subject) => (
          <Button
            className="justify-start"
            data-testid={`subject-name-lookup-result-${removeSubjectIdScope(subject.id)}`}
            key={subject.id}
            type="button"
            variant="ghost"
            onClick={() => void onSubmit({ id: subject.id })}
          >
            <span className="font-medium">
              {subject.firstName} {subject.lastName}
            </span>
            <span className="text-muted-foreground ml-2 text-xs">{removeSubjectIdScope(subject.id)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
