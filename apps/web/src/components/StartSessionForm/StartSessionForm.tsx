/* eslint-disable perfectionist/sort-objects */

import { Form } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { FormTypes } from '@opendatacapture/runtime-core';
import { DEFAULT_GROUP_NAME } from '@opendatacapture/schemas/core';
import type { Group } from '@opendatacapture/schemas/group';
import { $SessionType } from '@opendatacapture/schemas/session';
import type { CreateSessionData } from '@opendatacapture/schemas/session';
import { $SubjectIdentificationMethod } from '@opendatacapture/schemas/subject';
import type { Sex, SubjectIdentificationMethod } from '@opendatacapture/schemas/subject';
import { encodeScopedSubjectId, generateSubjectHash } from '@opendatacapture/subject-utils';
import type { Promisable } from 'type-fest';
import { z } from 'zod/v4';

const currentDate = new Date();

const EIGHTEEN_YEARS = 568025136000; // milliseconds

const MIN_DATE_OF_BIRTH = new Date(currentDate.getTime() - EIGHTEEN_YEARS);

type StartSessionFormData = {
  sessionDate: string;
  sessionType: 'IN_PERSON' | 'RETROSPECTIVE';
  subjectDateOfBirth?: string;
  subjectFirstName?: string;
  subjectId?: string;
  subjectIdentificationMethod: SubjectIdentificationMethod;
  subjectLastName?: string;
  subjectSex?: Sex;
};

type StartSessionFormProps = {
  currentGroup: Group | null;
  initialValues?: FormTypes.PartialNullableData<StartSessionFormData>;
  onSubmit: (data: CreateSessionData) => Promisable<void>;
  readOnly: boolean;
  username?: null | string;
};

export const StartSessionForm = ({
  currentGroup,
  username,
  initialValues,
  readOnly,
  onSubmit
}: StartSessionFormProps) => {
  const { resolvedLanguage, t } = useTranslation();
  const isAltaHealthServices = currentGroup?.name === 'Alta Health Services';

  // For Alta Health Services, show simplified form with only session date
  if (isAltaHealthServices) {
    return (
      <Form
        preventResetValuesOnReset
        suspendWhileSubmitting
        className="mx-auto max-w-3xl"
        content={[
          {
            title: t({
              ca: 'Iniciar Registre',
              en: 'Start Record',
              es: 'Iniciar Registro',
              fr: "Démarrer l'enregistrement"
            }),
            description: t({
              ca: "Seleccioneu la data per iniciar una nova sessió. Podreu afegir múltiples registres de pacients dins d'aquesta sessió.",
              en: 'Select the date to start a new session. You will be able to add multiple patient records within this session.',
              es: 'Seleccione la fecha para iniciar una nueva sesión. Podrá agregar múltiples registros de pacientes dentro de esta sesión.',
              fr: 'Sélectionnez la date pour démarrer une nouvelle session. Vous pourrez ajouter plusieurs dossiers de patients dans cette session.'
            }),
            fields: {
              sessionDate: {
                kind: 'date',
                disabled: true,
                label: t({
                  ca: 'Data de la Sessió',
                  en: 'Session Date',
                  es: 'Fecha de la Sesión',
                  fr: 'Date de la Session'
                }),
                description: t({
                  ca: 'La data en què es realitza aquesta sessió (Avui)',
                  en: 'The date when this session is being conducted (Today)',
                  es: 'La fecha en que se realiza esta sesión (Hoy)',
                  fr: "La date à laquelle cette session est effectuée (Aujourd'hui)"
                })
              } as any
            }
          }
        ]}
        data-testid="start-session-form"
        initialValues={{
          sessionDate: new Date()
        }}
        readOnly={readOnly}
        submitBtnLabel={t('core.submit')}
        validationSchema={z.object({
          sessionDate: z.any()
        })}
        onSubmit={async () => {
          const subjectId = encodeScopedSubjectId(username!, {
            groupName: currentGroup?.name ?? DEFAULT_GROUP_NAME
          });

          await onSubmit({
            date: new Date(),
            groupId: currentGroup?.id ?? null,
            username: username ?? null,
            type: 'RETROSPECTIVE',
            subjectData: {
              id: subjectId
            }
          });
        }}
      />
    );
  }

  // For all other groups, show the standard form
  return (
    <Form
      preventResetValuesOnReset
      suspendWhileSubmitting
      className="mx-auto max-w-3xl"
      content={[
        {
          title: t('common.identificationMethod'),
          description: t('common.identificationMethodDesc'),
          fields: {
            subjectIdentificationMethod: {
              kind: 'string',
              label: t({
                ca: 'Mètode',
                en: 'Method',
                es: 'Método',
                fr: 'Méthode'
              }),
              options: {
                CUSTOM_ID: t('common.customIdentifier'),
                PERSONAL_INFO: t('common.personalInfo')
              } as any,
              variant: 'select'
            }
          }
        },
        {
          title: t('common.subjectIdentification.title'),
          fields: {
            subjectId: {
              kind: 'dynamic',
              deps: ['subjectIdentificationMethod'],
              render({ subjectIdentificationMethod }) {
                return subjectIdentificationMethod === 'CUSTOM_ID'
                  ? {
                      kind: 'string',
                      label: t('common.identifier'),
                      variant: 'input'
                    }
                  : null;
              }
            },
            subjectFirstName: {
              kind: 'dynamic',
              deps: ['subjectIdentificationMethod'],
              render({ subjectIdentificationMethod }) {
                return subjectIdentificationMethod === 'PERSONAL_INFO'
                  ? {
                      description: t('common.subjectIdentification.firstName.description'),
                      kind: 'string',
                      label: t('common.subjectIdentification.firstName.label'),
                      variant: 'input'
                    }
                  : null;
              }
            },
            subjectLastName: {
              kind: 'dynamic',
              deps: ['subjectIdentificationMethod'],
              render({ subjectIdentificationMethod }) {
                return subjectIdentificationMethod === 'PERSONAL_INFO'
                  ? {
                      description: t('common.subjectIdentification.lastName.description'),
                      kind: 'string',
                      label: t('common.subjectIdentification.lastName.label'),
                      variant: 'input'
                    }
                  : null;
              }
            },
            subjectDateOfBirth: {
              kind: 'dynamic',
              deps: ['subjectIdentificationMethod'],
              render({ subjectIdentificationMethod }) {
                return subjectIdentificationMethod === 'PERSONAL_INFO'
                  ? {
                      kind: 'string',
                      variant: 'input',
                      type: 'date',
                      label: t('core.identificationData.dateOfBirth.label')
                    }
                  : null;
              }
            },
            subjectSex: {
              kind: 'dynamic',
              deps: ['subjectIdentificationMethod'],
              render({ subjectIdentificationMethod }) {
                return subjectIdentificationMethod === 'PERSONAL_INFO'
                  ? {
                      description: t('core.identificationData.sex.description'),
                      kind: 'string',
                      label: t('core.identificationData.sex.label'),
                      options: {
                        FEMALE: t('core.identificationData.sex.female'),
                        MALE: t('core.identificationData.sex.male')
                      },
                      variant: 'select'
                    }
                  : null;
              }
            }
          }
        },
        {
          title: t('session.additionalData.title'),
          fields: {
            sessionType: {
              kind: 'string',
              label: t('session.type.label'),
              variant: 'select',
              options: {
                RETROSPECTIVE: t('session.type.retrospective'),
                IN_PERSON: t('session.type.in-person')
              }
            },
            sessionDate: {
              kind: 'dynamic',
              deps: ['sessionType'],
              render({ sessionType }) {
                return sessionType === 'RETROSPECTIVE'
                  ? {
                      description: t('session.dateAssessed.description'),
                      kind: 'string',
                      variant: 'input',
                      type: 'date',
                      label: t('session.dateAssessed.label')
                    }
                  : null;
              }
            }
          }
        }
      ]}
      data-testid="start-session-form"
      initialValues={initialValues}
      readOnly={readOnly}
      submitBtnLabel={t('core.submit')}
      validationSchema={z
        .object({
          subjectFirstName: z.string().optional(),
          subjectLastName: z.string().optional(),
          subjectIdentificationMethod: $SubjectIdentificationMethod,
          subjectId: z
            .string()
            .min(1)
            .refine(
              (arg) => !arg.includes('$'),
              t({
                en: 'Illegal character: $',
                fr: 'Caractère illégal : $'
              })
            )
            .optional(),
          subjectDateOfBirth: z
            .string()
            .optional()
            .transform((arg) => {
              if (!arg) return undefined;
              const d = new Date(arg);
              d.setHours(12, 0, 0, 0);
              return d;
            })
            .refine((date) => !date || date <= MIN_DATE_OF_BIRTH, { message: t('session.errors.mustBeAdult') }),
          subjectSex: z.enum(['MALE', 'FEMALE']).optional(),
          sessionType: $SessionType.exclude(['REMOTE']).optional(),
          sessionDate: z
            .string()
            .optional()
            .transform((arg) => {
              if (!arg) return undefined;
              const d = new Date(arg);
              d.setHours(12, 0, 0, 0);
              return d;
            })
            .refine((date) => !date || date <= currentDate, { message: t('session.errors.assessmentMustBeInPast') })
        })
        .superRefine((val, ctx) => {
          if (val.subjectIdentificationMethod === 'CUSTOM_ID') {
            if (!val.subjectId) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t('core.form.requiredField'),
                path: ['subjectId']
              });
            } else if (currentGroup?.settings.idValidationRegex) {
              try {
                const regex = new RegExp(currentGroup?.settings.idValidationRegex);
                if (!regex.test(val.subjectId)) {
                  const customErrorMessage = currentGroup.settings.idValidationRegexErrorMessage;
                  const errorMessageFromGroup = customErrorMessage?.[resolvedLanguage];

                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                      errorMessageFromGroup ??
                      t({
                        ca: `Ha de coincidir amb l'expressió regular: ${regex.source}`,
                        en: `Must match regular expression: ${regex.source}`,
                        es: `Debe coincidir con la expresión regular: ${regex.source}`,
                        fr: `Doit correspondre à l'expression régulière : ${regex.source}`
                      }),
                    path: ['subjectId']
                  });
                }
              } catch (err) {
                // this should be checked already on the backend
                console.error(err);
              }
            }
          } else if (val.subjectIdentificationMethod === 'PERSONAL_INFO') {
            const requiredKeys = ['subjectFirstName', 'subjectLastName', 'subjectSex', 'subjectDateOfBirth'] as const;
            for (const key of requiredKeys) {
              if (!val[key]) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: t('core.form.requiredField'),
                  path: [key]
                });
              }
            }
          }
        })}
      onSubmit={async ({
        sessionType,
        sessionDate,
        subjectId,
        subjectFirstName,
        subjectLastName,
        subjectDateOfBirth,
        subjectSex
      }) => {
        // For Alta Health Services, always use RETROSPECTIVE type
        const finalSessionType = isAltaHealthServices ? 'RETROSPECTIVE' : sessionType!;
        const finalSessionDate = isAltaHealthServices ? sessionDate! : (sessionDate ?? currentDate);

        if (!subjectId) {
          subjectId = await generateSubjectHash({
            firstName: subjectFirstName!,
            lastName: subjectLastName!,
            dateOfBirth: subjectDateOfBirth!,
            sex: subjectSex!
          });
        } else {
          subjectId = encodeScopedSubjectId(subjectId, {
            groupName: currentGroup?.name ?? DEFAULT_GROUP_NAME
          });
        }
        await onSubmit({
          date: finalSessionDate,
          groupId: currentGroup?.id ?? null,
          username: username ?? null,
          type: finalSessionType,
          subjectData: {
            id: subjectId,
            firstName: subjectFirstName,
            lastName: subjectLastName,
            dateOfBirth: subjectDateOfBirth,
            sex: subjectSex
          }
        });
      }}
    />
  );
};

export type { StartSessionFormData };
