import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button, Card } from '@douglasneuroinformatics/libui/components';
import { useEventListener, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { FormTypes } from '@opendatacapture/runtime-core';
import type { Session } from '@opendatacapture/schemas/session';
import { useNavigate } from '@tanstack/react-router';
import { mean } from 'lodash-es';
import { XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { match } from 'ts-pattern';
import type { Promisable } from 'type-fest';

import type { StartSessionFormData } from '@/components/StartSessionForm';
import { config } from '@/config';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useAppStore } from '@/store';

const CURRENT_DATE = new Date();
const START_SESSION_DATA: FormTypes.PartialNullableData<StartSessionFormData> = {
  sessionType: 'IN_PERSON',
  subjectId: '123',
  subjectIdentificationMethod: 'CUSTOM_ID'
};

const SESSION_DATA: Session = {
  createdAt: CURRENT_DATE,
  date: CURRENT_DATE,
  groupId: null,
  id: '123',
  subject: {
    createdAt: CURRENT_DATE,
    groupIds: [],
    id: '123',
    updatedAt: CURRENT_DATE
  },
  subjectId: '123',
  type: 'IN_PERSON',
  updatedAt: CURRENT_DATE
};

type WalkthroughStep = {
  content: React.ReactNode;
  navigateOptions?: {
    state?: {
      [key: string]: any;
    };
    to: string;
  };
  onBeforeQuery?: () => Promisable<void>;
  position: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-left';
  target: string;
  title: string;
};

const Walkthrough = () => {
  const setIsWalkthroughComplete = useAppStore((store) => store.setIsWalkthroughComplete);
  const startSession = useAppStore((store) => store.startSession);
  const endSession = useAppStore((store) => store.endSession);
  const { resolvedLanguage, t } = useTranslation();
  const setIsWalkthroughOpen = useAppStore((store) => store.setIsWalkthroughOpen);
  const [index, setIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEventListener('resize', () => setIsWalkthroughOpen(false), undefined, { once: true });

  const steps = useMemo<WalkthroughStep[]>(() => {
    return [
      {
        content: (
          <p>
            {t({
              ca: 'Aquest tutorial proporciona una breu visió general de com utilitzar Open Data Capture.',
              en: 'This tutorial provides a brief overview of how to use Open Data Capture.',
              es: 'Este tutorial proporciona una breve descripción de cómo usar Open Data Capture.',
              fr: "Ce tutoriel donne un bref aperçu de l'utilisation de la plateforme Open Data Capture."
            })}{' '}
            <span className="font-bold">
              {t({
                ca: 'Si us plau, completeu-lo abans de fer qualsevol pregunta sobre la plataforma.',
                en: 'Please complete it before asking any questions about the platform.',
                es: 'Por favor, complételo antes de hacer cualquier pregunta sobre la plataforma.',
                fr: 'Veuillez le compléter avant de poser des questions sur la plateforme.'
              })}
            </span>{' '}
            {t({
              ca: 'Després de completar el tutorial, aquesta finestra emergent ja no apareixerà quan inicieu sessió a Open Data Capture.',
              en: 'After completing the tutorial, this popup will no longer appear when you log in to Open Data Capture.',
              es: 'Después de completar el tutorial, esta ventana emergente ya no aparecerá cuando inicie sesión en Open Data Capture.',
              fr: "Après avoir suivi le tutoriel, cette fenêtre ne s'affichera plus lorsque vous vous connecterez à la plateforme."
            })}
          </p>
        ),
        navigateOptions: {
          to: '/dashboard'
        },
        position: 'bottom-left',
        target: '#sidebar-branding-container',
        title: t({
          ca: 'Benvingut a Open Data Capture 👋',
          en: 'Welcome to Open Data Capture 👋',
          es: 'Bienvenido a Open Data Capture 👋',
          fr: 'Bienvenue à Open Data Capture 👋'
        })
      },
      {
        content: (
          <p>
            {t({
              ca: 'En aquesta pàgina, podeu veure una visió general de les dades recollides pel vostre grup.',
              en: 'On this page, you can see an overview of the data collected by your group.',
              es: 'En esta página, puede ver una descripción general de los datos recopilados por su grupo.',
              fr: 'Sur cette page, vous pouvez voir un aperçu des données collectées par votre groupe.'
            })}
          </p>
        ),
        navigateOptions: {
          to: '/dashboard'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/dashboard"]',
        title: t({
          ca: 'Tauler de control',
          en: 'Dashboard',
          es: 'Panel de control',
          fr: 'Tableau de bord'
        })
      },
      {
        content: (
          <p>
            {t({
              ca: 'En aquesta pàgina, podeu visualitzar i exportar les dades que ha recollit el vostre grup.',
              en: 'On this page, you can view and export the data your group has collected.',
              es: 'En esta página, puede ver y exportar los datos que ha recopilado su grupo.',
              fr: 'Sur cette page, vous pouvez visualiser et exporter les données collectées par votre groupe.'
            })}
          </p>
        ),
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/datahub"]',
        title: t({
          ca: 'Centre de dades',
          en: 'Data Hub',
          es: 'Centro de datos',
          fr: 'Centre de données'
        })
      },
      {
        content: (
          <p>
            {t({
              ca: 'Aquí podeu cercar subjectes a la base de dades. Per començar, feu clic a la barra de cerca i apareixerà una finestra emergent on podreu introduir la consulta de cerca.',
              en: 'Here, you can search for subjects in the database. To begin, click on the search bar, and a popup will appear where you can enter the search query.',
              es: 'Aquí puede buscar sujetos en la base de datos. Para comenzar, haga clic en la barra de búsqueda y aparecerá una ventana emergente donde puede ingresar la consulta de búsqueda.',
              fr: "Ici, vous pouvez rechercher des clients dans la base de données. Pour commencer, cliquez sur la barre de recherche et une fenêtre contextuelle s'affichera pour vous permettre de saisir la requête de recherche."
            })}
          </p>
        ),
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-left',
        target: '#subject-lookup-search-bar',
        title: t({
          ca: 'Cerca de subjecte',
          en: 'Subject Lookup',
          es: 'Búsqueda de sujeto',
          fr: 'Recherche de client'
        })
      },
      {
        content: t({
          ca: 'Aquí podeu exportar totes les vostres dades en diversos formats.',
          en: 'Here, you can export all your data in various formats.',
          es: 'Aquí puede exportar todos sus datos en varios formatos.',
          fr: 'Ici, vous pouvez exporter toutes vos données dans différents formats.'
        }),
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-right',
        target: '[data-spotlight-type="export-data-dropdown"]',
        title: t({
          ca: 'Exportació massiva de dades',
          en: 'Bulk Data Export',
          es: 'Exportación masiva de datos',
          fr: 'Exportation de données'
        })
      },
      {
        content: t({
          ca: "En aquesta pàgina, podeu iniciar una nova sessió per a un subjecte. Hi ha diverses opcions disponibles en funció del mètode d'identificació que trieu i del tipus de sessió.",
          en: 'On this page, you can start a new session for a subject. Various options are available based on the identification method you choose and the type of session.',
          es: 'En esta página, puede iniciar una nueva sesión para un sujeto. Hay varias opciones disponibles según el método de identificación que elija y el tipo de sesión.',
          fr: "Sur cette page, vous pouvez démarrer une nouvelle session pour un client. Différentes options sont disponibles en fonction de la méthode d'identification choisie et du type de session."
        }),
        navigateOptions: {
          state: {
            initialValues: START_SESSION_DATA
          },
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/session/start-session"]',
        title: t({
          ca: 'Iniciar sessió',
          en: 'Start Session',
          es: 'Iniciar sesión',
          fr: 'Commencer une session'
        })
      },
      {
        content: t({
          ca: "Podeu iniciar una sessió amb un ID personalitzat o deixar que el sistema en creï un utilitzant la informació personal del subjecte. Si trieu l'opció de generació automàtica, l'ID es crea al vostre navegador, de manera que el nom i cognoms del subjecte mai s'envien al nostre servidor.",
          en: "You can start a session with a custom ID or let the system create one using the subject's personal information. If you choose the auto-generate option, the ID is created in your browser, so the subject's first and last names are never sent to our server.",
          es: 'Puede iniciar una sesión con un ID personalizado o dejar que el sistema cree uno usando la información personal del sujeto. Si elige la opción de generación automática, el ID se crea en su navegador, por lo que el nombre y apellidos del sujeto nunca se envían a nuestro servidor.',
          fr: "Vous pouvez démarrer une session avec un identifiant personnalisé ou laisser le système en créer un à l'aide des informations personnelles du client. Si vous choisissez l'option de génération automatique, l'identifiant est créé dans votre navigateur, de sorte que les nom et prénom du client ne sont jamais envoyés à notre serveur."
        }),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'div[data-field-group="subjectIdentificationMethod"]',
        title: t({
          ca: "Mètode d'identificació",
          en: 'Identification Method',
          es: 'Método de identificación',
          fr: "Méthode d'identification"
        })
      },
      {
        content: t({
          ca: "Podeu utilitzar qualsevol ID que vulgueu; el nom del vostre grup s'afegirà automàticament per garantir que sigui únic.",
          en: 'You can use any ID you like; your group name will automatically be appended to ensure it is unique.',
          es: 'Puede usar cualquier ID que desee; el nombre de su grupo se agregará automáticamente para garantizar que sea único.',
          fr: "Vous pouvez utiliser l'identifiant de votre choix ; le nom de votre groupe sera automatiquement ajouté pour garantir son unicité."
        }),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'div[data-field-group="subjectId"]',
        title: t({
          ca: 'Identificador',
          en: 'Identifier',
          es: 'Identificador',
          fr: 'Identification du client'
        })
      },
      {
        content: t({
          ca: 'Podeu triar una sessió presencial (per defecte) o una sessió retrospectiva per introduir dades recollides prèviament utilitzant un sistema diferent.',
          en: 'You can choose either an in-person session (the default) or a retrospective session to enter data previously collected using a different system.',
          es: 'Puede elegir una sesión presencial (predeterminada) o una sesión retrospectiva para ingresar datos recopilados previamente usando un sistema diferente.',
          fr: "Vous pouvez choisir une session en personne (par défaut) ou une session rétrospective pour saisir des données précédemment collectées à l'aide d'un autre système."
        }),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'top-left',
        target: 'div[data-field-group="sessionType"]',
        title: t({
          ca: "Tipus d'avaluació",
          en: 'Type of Assessment',
          es: 'Tipo de evaluación',
          fr: "Type d'évaluation"
        })
      },
      {
        content: t({
          ca: 'Aquí podeu veure la sessió actual en curs.',
          en: 'Here, you can see the current session in progress.',
          es: 'Aquí puede ver la sesión actual en progreso.',
          fr: 'Ici, vous pouvez voir la session en cours.'
        }),
        navigateOptions: {
          to: '/session/start-session'
        },
        onBeforeQuery() {
          startSession(SESSION_DATA);
        },
        position: 'top-left',
        target: '#current-session-card',
        title: t({
          ca: 'Sessió en curs',
          en: 'Session in Progress',
          es: 'Sesión en progreso',
          fr: 'Session en cours'
        })
      },
      {
        content: t({
          ca: "En aquesta pàgina, podeu seleccionar l'instrument que voleu administrar.",
          en: 'On this page, you can select the instrument you want to administer.',
          es: 'En esta página, puede seleccionar el instrumento que desea administrar.',
          fr: "Sur cette page, vous pouvez sélectionner l'instrument que vous souhaitez administrer."
        }),
        navigateOptions: {
          state: {
            initialValues: START_SESSION_DATA
          },
          to: '/instruments/accessible-instruments'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/instruments/accessible-instruments"]',
        title: t({
          ca: 'Administrar instrument',
          en: 'Administer Instrument',
          es: 'Administrar instrumento',
          fr: 'Administrer un instrument'
        })
      },
      {
        content: t({
          ca: "En aquesta pàgina, podeu veure les dades del subjecte de la sessió actual. Per accedir a les dades d'altres subjectes, utilitzeu el botó de cerca a la pàgina del Centre de dades.",
          en: 'On this page, you can view the data for the subject of the current session. To access data for other subjects, use the lookup button on the Data Hub page.',
          es: 'En esta página, puede ver los datos del sujeto de la sesión actual. Para acceder a los datos de otros sujetos, use el botón de búsqueda en la página del Centro de datos.',
          fr: "Sur cette page, vous pouvez consulter les données du client pour lequel la session est en cours. Pour accéder aux données d'autres clients, utilisez le bouton de recherche sur la page du centre de données."
        }),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/datahub/123/table"]',
        title: t({
          ca: 'Veure subjecte',
          en: 'View Subject',
          es: 'Ver sujeto',
          fr: 'Voir le client'
        })
      },
      {
        content: t({
          ca: 'Aquí podeu veure els registres que aquest subjecte ha completat per a un instrument determinat.',
          en: 'Here, you can view the records this subject has completed for a given instrument.',
          es: 'Aquí puede ver los registros que este sujeto ha completado para un instrumento determinado.',
          fr: 'Ici, vous pouvez voir les enregistrements que ce client a complétés pour un instrument donné'
        }),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-center',
        target: 'a[data-nav-url="/datahub/123/table"]',
        title: t({
          ca: 'Taula',
          en: 'Table',
          es: 'Tabla',
          fr: 'Tableau'
        })
      },
      {
        content: t({
          ca: 'Aquí podeu exportar les dades de la taula en format CSV o JSON.',
          en: 'Here, you can export the data in the table to CSV or JSON format.',
          es: 'Aquí puede exportar los datos de la tabla en formato CSV o JSON.',
          fr: 'Ici, vous pouvez exporter les données du tableau au format CSV ou JSON.'
        }),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-right',
        target: 'div[data-spotlight-type="export-data-dropdown"]',
        title: t({
          ca: 'Exportació de dades',
          en: 'Data Export',
          es: 'Exportación de datos',
          fr: 'Exportation de données'
        })
      },
      {
        content: t({
          ca: 'Aquí podeu crear gràfics personalitzats per visualitzar dades longitudinals per a un subjecte determinat.',
          en: 'Here, you can create custom graphs to visualize longitudinal data for a given subject.',
          es: 'Aquí puede crear gráficos personalizados para visualizar datos longitudinales para un sujeto determinado.',
          fr: "Ici, vous pouvez créer des graphiques personnalisés pour visualiser les données longitudinales d'un client donné."
        }),
        navigateOptions: {
          to: '/datahub/123/graph'
        },
        position: 'bottom-right',
        target: 'a[data-nav-url="/datahub/123/graph"]',
        title: t({
          ca: 'Gràfic',
          en: 'Graph',
          es: 'Gráfico',
          fr: 'Graphique'
        })
      },
      {
        content: t({
          ca: 'Aquí podeu crear i veure assignacions, que són instruments que el subjecte ha de completar a casa.',
          en: 'Here, you can create and view assignments, which are instruments for a subject to complete at home.',
          es: 'Aquí puede crear y ver asignaciones, que son instrumentos para que el sujeto complete en casa.',
          fr: 'Ici, vous pouvez créer et visualiser des devoirs, qui sont des instruments que le client doit compléter à la maison.'
        }),
        navigateOptions: {
          to: '/datahub/123/assignments'
        },
        position: 'bottom-left',
        target: 'a[data-nav-url="/datahub/123/assignments"]',
        title: t({
          ca: 'Assignacions',
          en: 'Assignments',
          es: 'Asignaciones',
          fr: 'Devoirs'
        })
      }
    ];
  }, [resolvedLanguage]);

  const currentStep = steps[index]!;
  const isLastStep = index === steps.length - 1;

  const removeSpotlight = () => {
    targetRef.current?.setAttribute('data-spotlight', 'false');
  };

  const close = () => {
    endSession();
    removeSpotlight();
    setIndex(0);
    setIsWalkthroughOpen(false);
  };

  useLayoutEffect(() => {
    if (window.location.pathname !== currentStep.navigateOptions?.to) {
      void navigate({ state: currentStep.navigateOptions?.state, to: currentStep.navigateOptions?.to });
    }
    void (async function () {
      await currentStep.onBeforeQuery?.();
      targetRef.current = document.querySelector(currentStep.target);
      if (targetRef.current) {
        targetRef.current.setAttribute('data-spotlight', 'true');
        const rect = targetRef.current.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.clientHeight ?? 0;
        const popoverWidth = popoverRef.current?.clientWidth ?? 0;
        match(currentStep.position)
          .with('bottom-left', () => {
            setPopoverPosition({ x: rect.left, y: rect.bottom + 20 });
          })
          .with('bottom-right', () => {
            setPopoverPosition({ x: rect.right - popoverWidth, y: rect.bottom + 20 });
          })
          .with('bottom-center', () => {
            setPopoverPosition({ x: mean([rect.left, rect.right]) - popoverWidth / 2, y: rect.bottom + 20 });
          })
          .with('top-left', () => {
            setPopoverPosition({ x: rect.left, y: rect.top - popoverHeight - 20 });
          })
          .exhaustive();
      } else {
        console.error(`Failed to find element with query: ${currentStep.target}`);
      }
    })();
    return removeSpotlight;
  }, [index]);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.div
        animate={{ opacity: 100, x: popoverPosition.x, y: popoverPosition.y }}
        className="absolute"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0, x: popoverPosition.x, y: popoverPosition.y }}
        ref={popoverRef}
      >
        <Card className="max-w-md">
          <Card.Header className="pb-4">
            <Card.Title className="mr-4">{currentStep.title}</Card.Title>
            <Button className="absolute right-2 top-2" size="icon" type="button" variant="ghost" onClick={close}>
              <XIcon className="h-4 w-4" />
            </Button>
          </Card.Header>
          <Card.Content className="text-muted-foreground text-sm">{currentStep.content}</Card.Content>
          <Card.Footer className="flex justify-end gap-3">
            {index > 0 && (
              <Button type="button" variant="outline" onClick={() => setIndex(index - 1)}>
                {t({
                  ca: 'Enrere',
                  en: 'Back',
                  es: 'Atrás',
                  fr: 'Retour'
                })}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  setIsWalkthroughComplete(true);
                  close();
                } else {
                  setIndex(index + 1);
                }
              }}
            >
              {isLastStep
                ? t({
                    ca: 'Fet',
                    en: 'Done',
                    es: 'Hecho',
                    fr: 'Fin'
                  })
                : t({
                    ca: 'Següent',
                    en: 'Next',
                    es: 'Siguiente',
                    fr: 'Suivant'
                  })}
            </Button>
          </Card.Footer>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export const WalkthroughProvider: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isDisclaimerAccepted = useAppStore((store) => store.isDisclaimerAccepted);
  const isWalkthroughOpen = useAppStore((store) => store.isWalkthroughOpen);
  const isWalkthroughComplete = useAppStore((store) => store.isWalkthroughComplete);
  const setIsWalkthroughOpen = useAppStore((store) => store.setIsWalkthroughOpen);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const shouldDisableTutorial = import.meta.env.DEV && config.dev.disableTutorial;

    if (isDisclaimerAccepted && !isWalkthroughComplete && !shouldDisableTutorial) {
      setIsWalkthroughOpen(true);
    }
  }, [isDisclaimerAccepted, isWalkthroughComplete]);

  if (!isDesktop) {
    return children;
  }

  return (
    <React.Fragment>
      {children}
      <AnimatePresence>{isWalkthroughOpen && <Walkthrough />}</AnimatePresence>
    </React.Fragment>
  );
};
