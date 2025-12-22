# Guia per esborrar tots els instruments a Producció (Google Cloud)

Aquesta guia descriu com executar l'script per eliminar tots els instruments, assignacions i registres de la base de dades de producció.

**ATENCIÓ: Aquesta operació és destructiva i irreversible. Assegureu-vos de tenir una còpia de seguretat abans de procedir.**

## 1. Còpia de seguretat (Backup)

Abans de fer res, feu una còpia de seguretat de la base de dades. Si utilitzeu MongoDB Atlas o un servei gestionat, utilitzeu les seves eines de backup. Si teniu accés directe a la base de dades, podeu utilitzar `mongodump`.

Exemple amb `mongodump`:

```bash
mongodump --uri="mongodb+srv://<usuari>:<contrasenya>@<host>/<base_de_dades>" --out=./backup-$(date +%F)
```

## 2. Preparació de l'entorn

Necessitareu accés al codi font i a l'entorn on s'executa l'API, o bé executar-ho des de la vostra màquina local connectant-vos a la base de dades remota.

### Opció A: Execució des de local (Recomanat si teniu accés a la DB)

1.  Assegureu-vos de tenir el repositori clonat i les dependències instal·lades:

    ```bash
    pnpm install
    ```

2.  Obteniu la cadena de connexió de la base de dades de producció (`DATABASE_URL`). Aquesta sol estar en l'arxiu `.env` del servidor o en la configuració de Google Cloud.

3.  Creeu un fitxer `.env.production` (o modifiqueu el `.env` local temporalment) amb la variable `DATABASE_URL` apuntant a la base de dades de producció.
    ```env
    DATABASE_URL="mongodb+srv://..."
    ```

### Opció B: Execució des del servidor (Google Cloud)

1.  Accediu al servidor o contenidor on s'executa l'API.
2.  Navegueu al directori de l'aplicació.

## 3. Execució de l'script

L'script es troba a `apps/api/scripts/delete-all-instruments.ts`.

Per executar-lo, utilitzeu `tsx` (o `ts-node` si està configurat). Des de l'arrel del projecte:

```bash
# Si teniu el fitxer .env configurat correctament:
npx tsx apps/api/scripts/delete-all-instruments.ts

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
