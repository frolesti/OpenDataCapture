# Proceso de generación del código de paciente ORION

## Español

La plataforma genera automáticamente el código de paciente al iniciar una nueva visita de selección ORION. El código aparece en el formulario como una referencia visible y no editable para el investigador.

El formato es `OR-<investigador>-<paciente>`. Por ejemplo: `OR-01-01`.
El formato es `OR-<centro>-<paciente>`. Por ejemplo: `OR-01-01`.

- `<centro>` es el número anónimo de dos cifras del centro.
  Cada centro mantiene su propia secuencia.
  La generació es fa al servidor i queda registrada abans de mostrar el codi al formulari. La plataforma aplica restriccions d'unicitat sobre el codi complet i sobre la combinació de centre i seqüència. Per això, dues altes simultànies no poden produir el mateix codi. Pot haver-hi salts de numeració si s'inicia una selecció que finalment no es completa; aquests salts són intencionats i preserven la garantia de no reutilització.

- `OR` identifica el estudio ORION.
- `<investigador>` es el número anónimo de dos cifras del investigador.
- `<paciente>` es el número correlativo de paciente, con dos cifras como mínimo.

El código no contiene ningún dato clínico ni identificador directo del paciente.

La secuencia no tiene un límite predeterminado. Empieza en `01` y continúa de forma correlativa (`02`, `03`, etc.). Cada investigador mantiene su propia secuencia.

Los códigos nuevos siguen el formato de dos bloques numéricos definido arriba.

La generación se realiza en el servidor y queda registrada antes de mostrar el código en el formulario. La plataforma aplica restricciones de unicidad sobre el código completo y sobre la combinación centro, investigador y secuencia. Por ello, dos altas simultáneas no pueden producir el mismo código. Puede haber saltos de numeración si se inicia una selección que finalmente no se completa; estos saltos son intencionados y preservan la garantía de no reutilización.

El código se guarda con la visita de selección y se utiliza como referencia para vincular la visita de seguimiento de 3 meses, sin necesidad de usar datos identificativos directos del paciente.

## Català

La plataforma genera automàticament el codi de pacient quan s'inicia una nova visita de selecció ORION. El codi apareix al formulari com una referència visible i no editable per a l'investigador.

El format és `OR-<centre>-<pacient>`. Per exemple: `OR-01-01`.

- `OR` identifica l'estudi ORION.
- `<centre>` és el número anònim de dues xifres del centre.
- `<pacient>` és el número correlatiu de pacient, amb un mínim de dues xifres.

El codi no conté cap dada clínica ni identificador directe del pacient.

La seqüència no té un límit predeterminat. Comença a `01` i continua de forma correlativa (`02`, `03`, etc.). Cada investigador manté la seva pròpia seqüència.

Els codis nous segueixen el format de dos blocs numèrics definit més amunt.

La generació es fa al servidor i queda registrada abans de mostrar el codi al formulari. La plataforma aplica restriccions d'unicitat sobre el codi complet i sobre la combinació de centre, investigador i seqüència. Per això, dues altes simultànies no poden produir el mateix codi. Pot haver-hi salts de numeració si s'inicia una selecció que finalment no es completa; aquests salts són intencionats i preserven la garantia de no reutilització.

El codi es desa amb la visita de selecció i s'utilitza com a referència per vincular la visita de seguiment de 3 mesos, sense necessitat d'utilitzar dades identificatives directes del pacient.
