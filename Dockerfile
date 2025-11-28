# Use nginx alpine for a lightweight web server
FROM nginx:alpine

# Copy the HTML file to nginx's default serving directory
COPY index.html /usr/share/nginx/html/

# Copy any additional static files if they exist
COPY *.tsx /usr/share/nginx/html/ 2>/dev/null || true
COPY *.md /usr/share/nginx/html/ 2>/dev/null || true

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
