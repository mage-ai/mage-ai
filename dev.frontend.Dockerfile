FROM node:18-alpine

COPY ./mage_ai/frontend /home/src/app
WORKDIR /home/src/app

RUN yarn install
EXPOSE 3000

CMD ["yarn", "start"]
