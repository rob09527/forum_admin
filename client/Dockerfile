FROM node:lts-alpine
WORKDIR /build
# 默认华为云源（本机国内构建快）；CI 用 --build-arg NPM_REGISTRY 覆盖为官方源
ARG NPM_REGISTRY=https://mirrors.huaweicloud.com/repository/npm/
RUN npm config set registry ${NPM_REGISTRY}
# 锁 pnpm 11（与 lockfile 一致）
RUN npm install -g pnpm@11
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /build/
RUN pnpm install --frozen-lockfile
COPY ./ /build
RUN pnpm run build

FROM nginx
RUN mkdir /app
COPY --from=0 /build/dist /app
COPY --from=0 /build/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
