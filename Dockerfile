FROM nginx:alpine

# Fjern default Nginx-filer
RUN rm -rf /usr/share/nginx/html/*

# Kopier prosjektet ditt
COPY index.html /usr/share/nginx/html/
COPY imposter_game.tsx /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Expose port
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
