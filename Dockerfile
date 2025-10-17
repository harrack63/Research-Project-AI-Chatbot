# 1. Use the official Node.js image
FROM node:18-alpine AS deps

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# 4. Copy all files
COPY . .

# 5. Build the Next.js app
RUN npm run build

# 6. Use a lighter image for production
FROM node:18-alpine AS runner
WORKDIR /app

# 7. Copy built app and production deps only
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/public ./public
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/next.config.ts ./next.config.ts

# 8. Expose port 3000
EXPOSE 3000

# 9. Start the Next.js app on port 3000
CMD ["npm", "start", "--", "-p", "3000"]