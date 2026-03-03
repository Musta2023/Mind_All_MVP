# Stage 1: Building the application
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm i --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Stage 2: Production environment
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# When using output: 'standalone', Next.js creates a minimal build
# that includes only the necessary node_modules.
# Next.js standalone mode will have everything in the .next/standalone directory
# but we need to copy public and static as well.

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application (server.js is the entry point for standalone mode)
CMD ["node", "server.js"]
