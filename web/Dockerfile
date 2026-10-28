# Medepad Admin website (Next.js).
# NEXT_PUBLIC_API_URL is the backend address AS SEEN FROM THE ADMIN'S BROWSER; it is built into the site.
FROM node:22-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
