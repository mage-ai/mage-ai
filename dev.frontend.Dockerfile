FROM node:18-alpine

COPY ./mage_ai/frontend/.babelrc /home/src/mage_ai/frontend/.babelrc
COPY ./mage_ai/frontend/.env.development.local /home/src/mage_ai/frontend/.env.development.local
COPY ./mage_ai/frontend/.env.local /home/src/mage_ai/frontend/.env.local
COPY ./mage_ai/frontend/.eslintrc.js /home/src/mage_ai/frontend/.eslintrc.js
COPY ./mage_ai/frontend/.gitignore /home/src/mage_ai/frontend/.gitignore
COPY ./mage_ai/frontend/.prettierrc /home/src/mage_ai/frontend/.prettierrc
COPY ./mage_ai/frontend/.storybook /home/src/mage_ai/frontend/.storybook
COPY ./mage_ai/frontend/api /home/src/mage_ai/frontend/api
COPY ./mage_ai/frontend/components /home/src/mage_ai/frontend/components
COPY ./mage_ai/frontend/context /home/src/mage_ai/frontend/context
COPY ./mage_ai/frontend/hocs /home/src/mage_ai/frontend/hocs
COPY ./mage_ai/frontend/interfaces /home/src/mage_ai/frontend/interfaces
COPY ./mage_ai/frontend/mana /home/src/mage_ai/frontend/mana
COPY ./mage_ai/frontend/next_base_path.config.js /home/src/mage_ai/frontend/next_base_path.config.js
COPY ./mage_ai/frontend/next-env.d.ts /home/src/mage_ai/frontend/next-env.d.ts
COPY ./mage_ai/frontend/next.common.config.js /home/src/mage_ai/frontend/next.common.config.js
COPY ./mage_ai/frontend/next.config.js /home/src/mage_ai/frontend/next.config.js
COPY ./mage_ai/frontend/oracle /home/src/mage_ai/frontend/oracle
COPY ./mage_ai/frontend/package.json /home/src/mage_ai/frontend/package.json
COPY ./mage_ai/frontend/pages /home/src/mage_ai/frontend/pages
COPY ./mage_ai/frontend/playwright-windows.config.ci.ts /home/src/mage_ai/frontend/playwright-windows.config.ci.ts
COPY ./mage_ai/frontend/playwright.config.ci.ts /home/src/mage_ai/frontend/playwright.config.ci.ts
COPY ./mage_ai/frontend/playwright.config.ts /home/src/mage_ai/frontend/playwright.config.ts
COPY ./mage_ai/frontend/public /home/src/mage_ai/frontend/public
COPY ./mage_ai/frontend/scripts /home/src/mage_ai/frontend/scripts
COPY ./mage_ai/frontend/storage /home/src/mage_ai/frontend/storage
COPY ./mage_ai/frontend/stories /home/src/mage_ai/frontend/stories
COPY ./mage_ai/frontend/styles /home/src/mage_ai/frontend/styles
COPY ./mage_ai/frontend/tests /home/src/mage_ai/frontend/tests
COPY ./mage_ai/frontend/tsconfig.json /home/src/mage_ai/frontend/tsconfig.json
COPY ./mage_ai/frontend/utils /home/src/mage_ai/frontend/utils
COPY ./mage_ai/frontend/yarn.lock /home/src/mage_ai/frontend/yarn.lock
WORKDIR /home/src/mage_ai/frontend

RUN yarn install
EXPOSE 3000

CMD ["yarn", "start"]
