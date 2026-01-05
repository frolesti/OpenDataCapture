#!/bin/bash

# Kill any processes running on ports 3000, 3500, 5500 to prevent "EADDRINUSE" errors
echo "Cleaning up ports 3000, 3500, 5500..."
fuser -k 3000/tcp > /dev/null 2>&1
fuser -k 3500/tcp > /dev/null 2>&1
fuser -k 5500/tcp > /dev/null 2>&1

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing dependencies..."
  pnpm install
fi

# Start MongoDB container
docker-compose -f docker-compose.dev.yaml up -d mongo

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
until docker-compose -f docker-compose.dev.yaml exec mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  sleep 1
done

# Initiate replica set if not already initiated
echo "Checking replica set status..."
if ! docker-compose -f docker-compose.dev.yaml exec mongo mongosh --eval "rs.status()" | grep -q "myState"; then
  echo "Initiating replica set..."
  docker-compose -f docker-compose.dev.yaml exec mongo mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]});"
else
  echo "Replica set already initiated."
fi

# Run the original dev command
pnpm dev:core
