# Proceso de generación del código de paciente ORION

## Español

La plataforma genera automáticamente el código de paciente al iniciar una nueva visita de selección ORION. El código aparece en el formulario como una referencia visible y no editable para el investigador.

El formato es `OR-C<centro>-I<investigador>-P<secuencia>`. Por ejemplo: `OR-C001-I001-P001`.

- `OR` identifica el estudio ORION.
- `C<centro>` es el número anónimo de tres cifras del centro dentro del estudio.
- `I<investigador>` es el número anónimo de tres cifras del investigador dentro del estudio.
- `P<secuencia>` es el número correlativo de paciente para esa combinación concreta de centro e investigador.

El código no contiene ningún dato clínico ni identificador directo del paciente.

La secuencia no tiene un límite predeterminado. Empieza en `P001` y continúa de forma correlativa (`P002`, `P003`, etc.). Cada combinación de centro e investigador mantiene su propia secuencia.

La generación se realiza en el servidor y queda registrada antes de mostrar el código en el formulario. La plataforma aplica restricciones de unicidad sobre el código completo y sobre la combinación centro, investigador y secuencia. Por ello, dos altas simultáneas no pueden producir el mismo código. Puede haber saltos de numeración si se inicia una selección que finalmente no se completa; estos saltos son intencionados y preservan la garantía de no reutilización.

El código se guarda con la visita de selección y se utiliza como referencia para vincular la visita de seguimiento de 3 meses, sin necesidad de usar datos identificativos directos del paciente.

## Català

La plataforma genera automàticament el codi de pacient quan s'inicia una nova visita de selecció ORION. El codi apareix al formulari com una referència visible i no editable per a l'investigador.

El format és `OR-C<centre>-I<investigador>-P<seqüència>`. Per exemple: `OR-C001-I001-P001`.

- `OR` identifica l'estudi ORION.
- `C<centre>` és el número anònim de tres xifres del centre dins de l'estudi.
- `I<investigador>` és el número anònim de tres xifres de l'investigador dins de l'estudi.
- `P<seqüència>` és el número correlatiu de pacient per a aquella combinació concreta de centre i investigador.

El codi no conté cap dada clínica ni identificador directe del pacient.

La seqüència no té un límit predeterminat. Comença a `P001` i continua de forma correlativa (`P002`, `P003`, etc.). Cada combinació de centre i investigador manté la seva pròpia seqüència.

La generació es fa al servidor i queda registrada abans de mostrar el codi al formulari. La plataforma aplica restriccions d'unicitat sobre el codi complet i sobre la combinació de centre, investigador i seqüència. Per això, dues altes simultànies no poden produir el mateix codi. Pot haver-hi salts de numeració si s'inicia una selecció que finalment no es completa; aquests salts són intencionats i preserven la garantia de no reutilització.

El codi es desa amb la visita de selecció i s'utilitza com a referència per vincular la visita de seguiment de 3 mesos, sense necessitat d'utilitzar dades identificatives directes del pacient.
