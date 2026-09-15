import { useEffect } from 'react';

import { Button } from '@douglasneuroinformatics/libui/components';
import { useDownload, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { isAxiosError } from 'axios';
import { serializeError } from 'serialize-error';

export type ErrorPageProps = {
  error: unknown;
};

export const ErrorPage = ({ error }: ErrorPageProps) => {
  const download = useDownload();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  let heading = t({
    en: 'Error desconegut',
    fr: 'Error desconocido'
  });
  if (isAxiosError(error) && error.status) {
    heading = `${error.status} - ${t({
      en: 'No trobat',
      fr: 'No encontrado'
    })}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-1 p-3 text-center">
      <h1 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
        {t({
          en: "S'ha produït un error",
          fr: 'Se produjo un error'
        })}
      </h1>
      <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">{heading}</h3>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm sm:text-base">
        {t({
          en: "Disculpeu les molèsties. Descarregueu l'informe d'error amb el botó de sota i envieu-lo a l'administrador de la plataforma per obtenir assistència.",
          fr: 'Disculpe las molestias. Descargue el informe de error con el botón de abajo y envíelo al administrador de la plataforma para obtener asistencia.'
        })}
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void download('error.json', JSON.stringify(serializeError(error), null, 2));
          }}
        >
          {t({
            en: "Informe d'error",
            fr: 'Informe de error'
          })}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            window.location.assign(window.location.origin);
          }}
        >
          {t({
            en: 'Recarregar pàgina',
            fr: 'Recargar página'
          })}
        </Button>
      </div>
    </div>
  );
};
