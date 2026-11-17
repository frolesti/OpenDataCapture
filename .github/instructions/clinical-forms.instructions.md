---
description: "Use when generating, translating or modifying clinical CRF instruments, visit forms, dates, eligibility, questionnaires or form UX in OpenDataCapture. Applies the user's ORION and THERA requirements."
applyTo: 'apps/playground/src/instruments/production-documents/**/*.ts,apps/playground/scripts/build-*-instruments.ts,packages/schemas/src/instrument-records/thera*,packages/schemas/src/auth/**,packages/react-core/src/components/FormContent/**,packages/react-core/src/components/InstrumentSummary/**,packages/react-core/src/components/ErrorPage/**,apps/web/src/components/InstrumentShowcase/**,apps/web/src/components/InstrumentCard/**,apps/web/src/components/StudyVisitActions.tsx,apps/web/src/routes/_app/datahub/**,apps/web/src/hooks/useGlobalInstrumentVisualization.ts,apps/web/src/utils/thera-datahub.ts,apps/api/src/instrument-records/**,apps/api/src/vendor/configured.auth.module.ts,apps/web/src/store/slices/auth.slice.ts,apps/web/src/services/axios.ts'
---

# Normes obligatories per als formularis clinics

## Font clinica i decisions

- Llegir el CRF original, les taules, notes i visites abans de codificar. ORION
  es referencia funcional, no una especificacio clinica per als altres estudis.
- Inspeccionar els tipus del runtime, els esquemes de l'API i el renderer de
  libui actual abans d'escollir un control. No inventar propietats.
- Preguntar abans de canviar regles cliniques, puntuacions, criteris, finestres
  de visita o el tractament dels pacients no aptes.
- No afegir puntuacions, classificacions, investigadors o signatures que no
  estiguin documentats i aprovats.

## Presentacio i controls

- Ordenar les visites per protocol: visita basal, primera, segona, tercera i
  quarta visita. No ordenar aquestes visites alfabeticament pel titol.
- Incloure el moment, la visita de referencia, el marge de dies i les avaluacions
  en una unica fila "Detalles", just sota "Descripcion". No afegir fons destacats
  ni files separades de temporalitat o "Esta visita". Els investigadors nomes
  veuen coordinadors, descripcio, detalls, promotor i llicencia quan tenen contingut.
  No inventar dades absents ni mostrar edicio, idiomes, etiquetes o enllacos tecnics.
  No modificar les edicions publicades nomes per canviar la targeta.
- Fer servir noms de fitxer recognoscibles i titols descriptius. No duplicar el
  titol de l'instrument a la primera seccio.
- Escriure instruccions breus, separades per frases. Evitar comes afegides pel
  renderer entre elements d'una llista d'instruccions.
- Afegir ` *` a cada pregunta obligatoria quan sigui visible, inclosos els
  camps condicionals i les columnes obligatories de taules repetibles.
  No marcar com obligatoris camps opcionals ni informatius deshabilitats.
- A THERA, per peticio explicita, les dues EVA de totes les visites son inputs
  numerics `kind: 'number', variant: 'input', min: 1, max: 10`, amb validacio
  d'enters i sense resposta per defecte. No tornar-hi a posar sliders, ni
  instruccions o etiquetes 0-10. No modificar les edicions historiques.
- Als altres estudis, per a l'EVA, usar el rang documentat al CRF.
  Quan sigui un slider 0-10, usar `kind: 'number', variant: 'slider', min: 0, max: 10`.
  Indicar 0 i 10, el significat dels extrems i el valor seleccionat.
  Mostrar una linia de rang contrastada i instruccions visibles per seleccionar
  la puntuacio. No deixar aquestes instruccions nomes dins d'un tooltip.
  No assignar 0 com a resposta per defecte: cal una seleccio explicita i 0 ha
  de poder seleccionar-se sense haver de canviar primer a un altre valor.
- Usar controls accessibles, compatibles amb teclat i amb el disseny existent.
  No inserir inputs amb manipulacio del DOM ni enganxar nous renderers al marge
  de l'estat i la validacio del formulari.
- Mostrar les opcions de resposta radio una sota l'altra, no en files horitzontals,
  tret que l'usuari demani explicitament una altra disposicio.
  A THERA, alinear-les a l'esquerra com les preguntes, tambe les puntuacions
  numeriques i en pantalles amples. Comprovar-ho al renderer compartit, no
  nomes a la ruta web ni nomes amb la direccio vertical.
- No crear camps de text deshabilitats o buits per presentar dates o instruccions.
  Mostrar la finestra de visita com a text informatiu fora dels controls del formulari.

## Dates

- Mostrar i permetre introduir dates en format `DD/MM/AAAA`, amb calendari
  coherent amb el mateix format. No dependre del format regional del navegador.
- Per a THERA, usar el camp `kind: 'date', displayFormat: 'dd/MM/yyyy'`.
  La normalitzacio conserva `AAAA-MM-DD` a l'API i als registres.
- Conservar la representacio historica de cada estudi. No aplicar canvis globals
  de dates als altres estudis quan el canvi nomes afecta un estudi.
- Validar dies reals, anys de traspas, ordre cronologic i limits inclusius.
  No buidar silenciosament una data invalida: mostrar l'error al camp.
- Provar entrada manual, calendari, esborranys, edicio i JSON en zones horaries
  positives i negatives. Una data de calendari no ha de canviar de dia.

## Consentiment, aptitud i validacio

- No permetre mai enviar un formulari incomplet. Tots els camps obligatoris
  actius han de tenir respostes valides abans de desar un registre definitiu.
  Un esborrany pot ser incomplet, pero no equival a un formulari enviat.
  Provar un intent real d'enviament buit i parcial: el callback d'enviament
  no s'ha d'executar i els errors han d'apareixer als camps corresponents.
- Replicar la logica funcional d'ORION: error especific al camp que falla.
  Amagar camps, posar-los deshabilitats o mostrar un resultat informatiu no
  substitueix la validacio.
- A THERA, sense consentiment, amb una inclusio `no` o una exclusio `si`,
  mostrar l'error al camp i bloquejar l'enviament. No generar la seccio
  "Resultado del cribado" ni un fals input informatiu per a aquest resultat.
- Recollir edat, EVA i VHI abans de fer-los servir per determinar l'aptitud.
  No crear dependencies circulars que impedeixin demostrar un criteri.
- A THERA V0, mostrar la resta de seccions quan hi hagi consentiment afirmatiu,
  data de consentiment valida i totes les inclusions afirmatives. No esperar
  l'edat, les exclusions ni els resultats EVA/VHI per mostrar-les, ni amagar-les
  quan canviin aquestes respostes. Conservar les dependencies especifiques
  de cada pregunta i tots els bloquejos de validacio i de data de visita.
  La visibilitat no substitueix ni determina l'aptitud clinica.
- Verificar edat >=18 i inclusio 3: VHI <15 o sequedat EVA >=5 o dispareunia
  EVA >=5. Assenyalar inconsistencies als camps corresponents.
- Requerir els camps actius i eliminar valors inactius abans de persistir.
  Validar de la mateixa manera a creacio, edicio, API i importacio.
- Els investigadors nomes poden avancar despres de desar totes les visites
  precedents del mateix pacient. Els administradors poden veure les visites
  per provar-les, pero no saltar-se la validacio clinica en desar.
- Recuperar dates de referencia i hospital dels registres autoritzats del
  mateix pacient. Rebutjar ancores o codis falsificats a l'API.
- A THERA, comprovar tambe la data d'avui: nomes obrir un seguiment si algun
  pacient pendent te la finestra oberta. No crear una pagina separada de selector
  de pacient ni duplicar el selector. Seleccionar el pacient una sola vegada dins
  de "Datos de la visita"; una data incorrecta
  deshabilita la resta de preguntes i impedeix enviar. Conservar l'edicio historica.
- Mostrar un sol missatge per pregunta o cel-la, combinant les causes diferents
  sense repetir el mateix text. Comprovar-ho al formulari real, no nomes a l'esquema.
- THERA acaba a la quarta visita. No crear un formulari independent de
  finalitzacio. Mantenir una base de dades unificada per estudi.

## Publicacio, dades i verificacio

- Excloure les plantilles amb nom intern o titol `<PLACEHOLDER>` del cataleg
  clinic. No reanomenar-les com si fossin un estudi real ni eliminar-ne registres.
- Els JWT nomes han de portar identitat, referencies de grups i permisos.
  No incloure grups sencers, llistes de pacients, usuaris, instruments ni dades
  del formulari a capcaleres HTTP. Carregar els detalls autoritzats des del perfil
  i esperar-ne la hidratacio abans de mostrar els instruments.
- Provar una investigadora amb un grup gran i la mida real d'Authorization:
  el creixement dels registres no ha de fer creixer el token. Reproduir el
  transport amb limits de capcaleres, no nomes comprovar que l'admin hi accedeix.
- HTTP 431 significa capcaleres massa grans, no "No trobat". Mostrar un missatge
  especific i permetre reiniciar la sessio. No enviar un token antic a login
  o als GET/POST publics de setup. Preservar-lo als PATCH/DELETE administratius.
  No modificar un JWT signat al navegador ni ampliar limits com a solucio provisional.
- Exportar els resultats tabulars amb les variables en columnes i una fila
  per registre. No confondre un resum vertical de variable/valor amb una base
  de dades exportable. Conservar les dades, l'escapat CSV i els valors compostos.
- A THERA, usar capcaleres identiques a taula, CSV i Excel: `v0_nom_del_camp`,
  `v1_nom_del_camp`, etc., amb barres baixes. No traduir-les a "Visita basal".
  No reanomenar per aixo els camps persistits.
- No mostrar ni exportar `group_id` a THERA. Conservar la separacio entre estudis
  internament, sense exposar identificadors tecnics a la taula.
- A THERA i ORION, el codi de pacient inicial es un input de text obligatori i lliure,
  sense format, prefix o numeracio preassignats. No reservar-lo ni substituir-lo
  a l'API. Als seguiments, seleccionar el codi ja desat i conservar els controls
  de duplicats, permisos, sequencia i finestres de visita.
- Els recordatoris THERA reutilitzen l'SMTP d'alta d'investigadors. Enviar-ne un
  7 dies abans d'obrir la finestra i un altre en obrir-la, nomes per a visites
  pendents amb tots els precedents guardats. Usar dates reals, controlar enviaments
  de manera persistent i no enviar fora de termini, despres de completar la
  visita, a admin o a comptes sense assignacio. No incloure respostes cliniques
  ni noms de pacients. Preparar una previsualitzacio HTML abans de provar SMTP.
- A les files unificades, conservar les icones d'edicio i eliminacio. Obrir un
  selector de visita; editar el formulari de l'edicio original amb les respostes
  i l'historic correctes, mai totes les preguntes barrejades. Permetre eliminar
  una visita o totes les del mateix pacient, amb confirmacio i operacio atomica.
  No eliminar una visita necessaria per validar altres visites que es conserven.
- Nomes `admin` te privilegis administratius. La resta de comptes son
  investigadors, sense permisos addicionals que els elevin. Aplicar-ho a l'API
  i invalidar les sessions antigues, no nomes amagar controls al navegador.
- No sobreescriure registres ni edicions historiques. Conservar identificadors
  de camps i valors de resposta quan nomes canvia el redactat o la presentacio.
- Preguntar l'ultima edicio publicada abans de preparar la seguent. No confondre
  una edicio local encara no publicada amb una edicio carregada a ODC.
- Modificar la plantilla i el protocol compartit, no nomes un fitxer generat.
  Regenerar totes les visites i els bundles i executar la comprovacio `--check`.
- Compilar i interpretar cada formulari amb el bundler real i validar-lo amb
  `$AnyInstrument`. Comprovar tambe els controls reals de libui, no nomes mocks.
- Seleccionar segons el canvi les proves dels errors al costat de cada criteri,
  els camps obligatoris, els extrems
  del rang (1 i 10 a THERA),
  dates impossibles, limits de visita, taules repetibles, esborranys i edicio.
- Desar els fitxers, executar la validacio mes estreta disponible i consultar
  Problems de tot el workspace. Identificar explicitament errors previs.
  Aplicar la validacio proporcional de les instruccions generals: no fer una
  compilacio web completa per canvis petits de formulari o estil. Regenerar
  instruments no implica compilar l'aplicacio web. No repetir proves superades
  ni reiniciar processos encallats carregant dependencies; comprovar la causa
  i usar una alternativa acotada, indicant qualsevol verificacio pendent.
- No publicar, desplegar, fer commits o crear pacients de prova a produccio
  sense autoritzacio. No incloure canvis locals aliens ni documentacio sobrera
  en una pujada de codi.
