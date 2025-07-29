#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Check for the MONGO_ATLAS_URI environment variable
if [ -z "${MONGO_ATLAS_URI:-}" ]; then
  echo "Error: MONGO_ATLAS_URI environment variable not set."
  echo "Usage: MONGO_ATLAS_URI='mongodb+srv://username:password@cluster.mongodb.net' $0"
  exit 1
fi

# Directory where the exports are stored
EXPORT_DIR="./mongodb_export"

# Check if export directory exists
if [ ! -d "$EXPORT_DIR" ]; then
  echo "Error: Export directory $EXPORT_DIR not found."
  echo "Run export-mongodb.sh first."
  exit 1
fi

# Database name for the target
TARGET_DB_NAME="data-capture-development"

# Import all collections to MongoDB Atlas
echo "Importing collections to MongoDB Atlas..."
mongorestore --uri="$MONGO_ATLAS_URI" --nsFrom="$TARGET_DB_NAME.*" --nsTo="$TARGET_DB_NAME.*" "$EXPORT_DIR/$TARGET_DB_NAME"

echo "Import completed to MongoDB Atlas"
