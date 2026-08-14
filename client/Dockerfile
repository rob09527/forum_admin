FROM node:lts-alpine
WORKDIR /build
# 设置npm镜像
RUN npm config set registry https://mirrors.huaweicloud.com/repository/npm/
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
