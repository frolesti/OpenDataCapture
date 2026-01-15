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
            {t('walkthrough.intro.text')} <span className="font-bold">{t('walkthrough.intro.bold')}</span>{' '}
            {t('walkthrough.intro.popup')}
          </p>
        ),
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-left',
        target: '#sidebar-branding-container',
        title: t('walkthrough.intro.title')
      },
      /* {
        content: <p>{t('walkthrough.dashboard.content')}</p>,
        navigateOptions: {
          to: '/dashboard'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/dashboard"]',
        title: t('walkthrough.dashboard.title')
      }, */
      {
        content: <p>{t('walkthrough.dataHub.content')}</p>,
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/datahub"]',
        title: t('walkthrough.dataHub.title')
      },
      {
        content: <p>{t('walkthrough.subjectLookup.content')}</p>,
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-left',
        target: '#subject-lookup-search-bar',
        title: t('walkthrough.subjectLookup.title')
      },
      {
        content: t('walkthrough.bulkDataExport.content'),
        navigateOptions: {
          to: '/datahub'
        },
        position: 'bottom-right',
        target: '[data-spotlight-type="export-data-dropdown"]',
        title: t('walkthrough.bulkDataExport.title')
      },
      {
        content: t('walkthrough.startRecord.content'),
        navigateOptions: {
          state: {
            initialValues: START_SESSION_DATA
          },
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/session/start-session"]',
        title: t('walkthrough.startRecord.title')
      },
      {
        content: t('walkthrough.identificationMethod.content'),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'div[data-field-group="subjectIdentificationMethod"]',
        title: t('walkthrough.identificationMethod.title')
      },
      {
        content: t('walkthrough.identifier.content'),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'bottom-left',
        target: 'div[data-field-group="subjectId"]',
        title: t('walkthrough.identifier.title')
      },
      {
        content: t('walkthrough.assessmentType.content'),
        navigateOptions: {
          to: '/session/start-session'
        },
        position: 'top-left',
        target: 'div[data-field-group="sessionType"]',
        title: t('walkthrough.assessmentType.title')
      },
      {
        content: t('walkthrough.sessionInProgress.content'),
        navigateOptions: {
          to: '/session/start-session'
        },
        onBeforeQuery() {
          startSession(SESSION_DATA);
        },
        position: 'top-left',
        target: '#current-session-card',
        title: t('walkthrough.sessionInProgress.title')
      },
      {
        content: t('walkthrough.administerInstrument.content'),
        navigateOptions: {
          state: {
            initialValues: START_SESSION_DATA
          },
          to: '/instruments/accessible-instruments'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/instruments/accessible-instruments"]',
        title: t('instruments.accessible.title')
      },
      {
        content: t('walkthrough.viewSubject.content'),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-left',
        target: 'button[data-nav-url="/datahub/123/table"]',
        title: t('walkthrough.viewSubject.title')
      },
      {
        content: t('walkthrough.table.content'),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-center',
        target: 'a[data-nav-url="/datahub/123/table"]',
        title: t('walkthrough.table.title')
      },
      {
        content: t('walkthrough.dataExport.content'),
        navigateOptions: {
          to: '/datahub/123/table'
        },
        position: 'bottom-right',
        target: 'div[data-spotlight-type="export-data-dropdown"]',
        title: t('walkthrough.dataExport.title')
      },
      {
        content: t('walkthrough.graph.content'),
        navigateOptions: {
          to: '/datahub/123/graph'
        },
        position: 'bottom-right',
        target: 'a[data-nav-url="/datahub/123/graph"]',
        title: t('walkthrough.graph.title')
      },
      {
        content: t('walkthrough.assignments.content'),
        navigateOptions: {
          to: '/datahub/123/assignments'
        },
        position: 'bottom-left',
        target: 'a[data-nav-url="/datahub/123/assignments"]',
        title: t('walkthrough.assignments.title')
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
                {t('walkthrough.buttons.back')}
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
              {isLastStep ? t('walkthrough.buttons.done') : t('walkthrough.buttons.next')}
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

  return (
    <React.Fragment>
      {children}
      <AnimatePresence>{isDesktop && isWalkthroughOpen && <Walkthrough />}</AnimatePresence>
    </React.Fragment>
  );
};
