FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install required dependencies for Prisma and Git
RUN apk add --no-cache git openssl libssl3 

COPY . .

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Run this for initialize new db
# RUN npx prisma migrate dev --name init
# RUN npm run seed

# Use a smaller runtime image
FROM node:22-alpine AS runtime

WORKDIR /app

# Install OpenSSL in runtime as well
RUN apk add --no-cache openssl libssl3 

# Copy built files and dependencies from builder stage
COPY --from=builder /app /app

# Set environment variables
ENV PORT=3001

# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "dev"]
