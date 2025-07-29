#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Directory to store the exports
EXPORT_DIR="./mongodb_export"
mkdir -p "$EXPORT_DIR"

# Database name - typically "data-capture-development" based on your drop-database.sh script
DB_NAME="data-capture-development"

# Export all collections in the database
echo "Exporting collections from $DB_NAME..."
for collection in $(mongosh "$DB_NAME" --quiet --eval "db.getCollectionNames().join('\n')")
do
  echo "Exporting $collection..."
  mongodump --db="$DB_NAME" --collection="$collection" --out="$EXPORT_DIR"
done

echo "Export completed to $EXPORT_DIR"
