# Use Node to build and serve
FROM node:20-alpine
WORKDIR /app

# Coolify will inject these from your 'Environment Variables' tab
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ARG VITE_FIRECRAWL_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_FIRECRAWL_API_KEY=$VITE_FIRECRAWL_API_KEY

# Install a tiny server to handle the static files
RUN npm install -g serve

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve the 'dist' folder on port 3200
EXPOSE 3200
CMD ["serve", "-s", "dist", "-l", "3200"]
