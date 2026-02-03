# Stage 1: Build the Vite app
FROM node:20-alpine AS build-stage
WORKDIR /app

# Add build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ARG VITE_FIRECRAWL_API_KEY

# Set them as environment variables
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_FIRECRAWL_API_KEY=$VITE_FIRECRAWL_API_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS production-stage
# Copy your custom config to override the default
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 3200
CMD ["nginx", "-g", "daemon off;"]
