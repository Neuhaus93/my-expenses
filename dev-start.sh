#!/bin/bash

# Create .env file with default Postgres variables
echo "POSTGRES_USER=myuser" >.env
echo "POSTGRES_PASSWORD=mypassword" >>.env
echo "POSTGRES_DB=mydatabase" >>.env
echo "DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydatabase" >>.env
echo "" >>.env

# Add a secret
echo "SECRET=DS9J6qBqgZnwlFqeMS76LOLxRwl+uM+SQOprxoM+nrE="

# Install packages
pnpm install

# Run Docker Compose
docker compose up -d

# Run drizzle-kit push
npx drizzle-kit push
