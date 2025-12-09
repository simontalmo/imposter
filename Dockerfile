FROM node:18-alpine

WORKDIR /app

# Installer serve-pakken for å hoste statiske filer
RUN npm install -g serve

# Kopier prosjektet ditt
COPY . /app

# Expose port 3000
EXPOSE 3300

# Host hele mappa via serve
CMD ["serve", "-s", ".", "-l", "3300"]
