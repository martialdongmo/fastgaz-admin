# Stage 1: Build the Angular app
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
# Install dependencie
RUN npm ci

RUN npm install -g @angular/cli
# Copy all files
COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve the Angular app with Nginx
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf


COPY --from=build /app/dist/fast-gaz-admin/browser /usr/share/nginx/html
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
