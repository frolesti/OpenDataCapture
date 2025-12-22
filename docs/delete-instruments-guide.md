# Guia per esborrar instruments a Producció (Google Cloud)

Aquesta guia explica com executar l'script de neteja contra l'entorn de producció allotjat a Google Cloud.

**Nota:** Com has indicat, aquesta guia assumeix que **NO** es necessita còpia de seguretat i que l'objectiu és eliminar tots els instruments, assignacions i registres existents.

## Mètode Recomanat: Execució des de Local connectant a Producció

La manera més senzilla i segura és executar l'script des del teu ordinador, apuntant a la base de dades de Google Cloud.

### Pas 1: Obtenir la cadena de connexió (DATABASE_URL)

Necessites la URL de connexió a MongoDB que utilitza el servidor de producció.

1.  Accedeix a la **Google Cloud Console** (https://console.cloud.google.com).
2.  Ves al servei on està allotjada l'API (normalment **Cloud Run** o **App Engine**).
3.  Busca la secció de configuració o variables d'entorn.
4.  Copia el valor de la variable `DATABASE_URL`. Hauria de tenir un format similar a:
    `mongodb+srv://<usuari>:<password>@<cluster>.mongodb.net/<base_de_dades>`

### Pas 2: Executar l'script

Des de la terminal del teu projecte (on tens aquest codi):

1.  Assegura't de tenir les dependències instal·lades:

    ```bash
    pnpm install
    ```

2.  Executa l'script passant la variable d'entorn directament. Substitueix `<LA_TEVA_URL_DE_PRODUCCIO>` pel valor que has copiat al Pas 1.

    **Linux/Mac:**

    ```bash
    DATABASE_URL="<LA_TEVA_URL_DE_PRODUCCIO>" npx tsx apps/api/scripts/delete-all-instruments.ts
    ```

    **Windows (PowerShell):**

    ```powershell
    $env:DATABASE_URL="<LA_TEVA_URL_DE_PRODUCCIO>"
    npx tsx apps/api/scripts/delete-all-instruments.ts
    ```

### Què farà l'script?

1.  Connectarà a la base de dades remota.
2.  Eliminarà **totes** les assignacions (`Assignment`).
3.  Eliminarà **tots** els registres de dades (`InstrumentRecord`).
4.  Netejarà la llista d'instruments accessibles de tots els grups.
5.  Eliminarà **tots** els instruments (`Instrument`).

Un cop acabi, veuràs un missatge "Cleanup complete".

# O passant la variable d'entorn directament:

DATABASE_URL="mongodb+srv://..." npx tsx apps/api/scripts/delete-all-instruments.ts

```

L'script realitzarà les següents accions:

1.  Esborrarà totes les **Assignacions** (`Assignment`).
2.  Esborrarà tots els **Registres d'Instruments** (`InstrumentRecord`).
3.  Actualitzarà tots els **Grups** per eliminar les referències als instruments accessibles.
4.  Esborrarà tots els **Instruments**.

## 4. Verificació

Un cop finalitzat l'script, podeu verificar que la base de dades està neta accedint-hi amb un client de MongoDB (com MongoDB Compass) o comprovant l'aplicació web. Els instruments haurien d'haver desaparegut.
```
