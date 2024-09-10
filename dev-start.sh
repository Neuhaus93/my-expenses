#!/bin/bash

# Create .env file with default Postgres variables
echo "POSTGRES_USER=myuser" >.env
echo "POSTGRES_PASSWORD=mypassword" >>.env
echo "POSTGRES_DB=mydatabase" >>.env
echo "DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydatabase" >>.env
echo "" >>.env

echo "CLERK_PUBLISHABLE_KEY=" >>.env
echo "CLERK_SECRET_KEY=" >>.env
echo "CLERK_SIGN_IN_URL=/sign-in" >>.env
echo "CLERK_SIGN_UP_URL=/sign-up" >>.env
echo "CLERK_SIGN_IN_FALLBACK_URL=/" >>.env
echo "CLERK_SIGN_UP_FALLBACK_URL=/" >>.env

# Install packages
pnpm install

# Run Docker Compose
docker compose up -d

# Run drizzle-kit push
npx drizzle-kit push

# User must add valid CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY values
