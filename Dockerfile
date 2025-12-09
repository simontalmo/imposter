FROM nginx:alpine

# Fjern default config
RUN rm /etc/nginx/conf.d/default.conf

# Lag en custom Nginx-config som kjører på port 3000
RUN printf "server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
}\n" > /etc/nginx/conf.d/custom.conf

# Kopier filene dine
COPY index.html /usr/share/nginx/html/
COPY imposter_game.tsx /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Expose port 3000 i containeren
EXPOSE 3000

CMD [\"nginx\", \"-g\", \"daemon off;\"]

