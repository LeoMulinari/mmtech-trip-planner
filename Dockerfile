FROM node:18-alpine AS builder
WORKDIR /app

# Copia os arquivos de manifesto de pacotes e instala todas as dependências 
COPY package*.json ./
RUN npm install

# Copia todo o resto do código do nosso projeto
COPY . .

ARG NEXT_PUBLIC_Maps_API_KEY

# Define a variável de ambiente com base no argumento passado
ENV NEXT_PUBLIC_Maps_API_KEY=$NEXT_PUBLIC_Maps_API_KEY

RUN npm run build


FROM node:18-alpine AS runner
WORKDIR /app

# Cria um usuário não-root para rodar a aplicação
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia apenas os artefatos necessários para a imagem final.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia a pasta do banco de dados para dentro da imagem final.
COPY database ./database
COPY --chown=nextjs:nodejs database ./database

# Muda para o usuário não-root
USER nextjs

# Expõe a porta que a aplicação vai usar
EXPOSE 3000

# Define a variável de ambiente da porta
ENV PORT=3000

# O comando para iniciar o servidor de produção do Next.js
CMD ["node", "server.js"]