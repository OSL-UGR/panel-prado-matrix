FROM node:22-alpine

WORKDIR /app

# Copiar los archivos de configuración y dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Comando para arrancar React (exponiendo al exterior con --host)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]