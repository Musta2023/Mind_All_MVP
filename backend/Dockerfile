# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma client (with a dummy DATABASE_URL to pass validation if needed)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Stage 2: Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy only necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
# Copy Prisma 7 config file
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Expose the port the backend runs on
EXPOSE 3001

# Command to push schema changes and then start the application
CMD ["sh", "-c", "npx prisma db push && npm run start:prod"]
