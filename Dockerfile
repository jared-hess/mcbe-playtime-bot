FROM node:14
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY wait-for.sh ./

RUN chmod +x wait-for.sh

# Install netcat (needed for wait-for)
RUN apt-get update && apt-get install -y netcat

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

COPY . .

CMD [ "node", "index.js" ]