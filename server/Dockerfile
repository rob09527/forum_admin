
# ============================================================
# admin-server（Cool Admin / Midway，端口 8001）
# 多阶段构建：编译阶段保留完整源码；运行阶段只保留编译产物，
# 不包含 src/ 下的 .ts 源码。
# ============================================================

# ---- 构建阶段 ----
FROM node:lts-alpine AS build

WORKDIR /app

# 配置alpine国内镜像加速
RUN sed -i "s@http://dl-cdn.alpinelinux.org/@https://repo.huaweicloud.com/@g" /etc/apk/repositories

# 安装tzdata,默认的alpine基础镜像不包含时区组件，安装后可通过TZ环境变量配置时区
RUN apk add --no-cache tzdata

# 设置时区为中国东八区，这里的配置可以被docker-compose.yml或docker run时指定的时区覆盖
ENV TZ="Asia/Shanghai"

# 默认华为云源（本机国内构建快）；CI 用 --build-arg NPM_REGISTRY 覆盖为官方源
ARG NPM_REGISTRY=https://mirrors.huaweicloud.com/repository/npm/
RUN npm config set registry ${NPM_REGISTRY}
# 锁 pnpm 11（allowBuilds 为 pnpm 11 语法，且与 lockfileVersion 9.0 一致）
RUN npm install -g pnpm@11

# 复制 package.json 及锁文件，pnpm 冻结安装依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
# 构建项目
COPY . .
RUN pnpm run build
# 删除开发期依赖，只留生产依赖（替代原 rm -rf node_modules && npm install）
RUN pnpm prune --prod

# ---- 运行阶段 ----
FROM node:lts-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache tzdata
ENV TZ="Asia/Shanghai"

COPY --from=build /app /app
# 删除源码：只留编译产物 dist/ + 依赖 node_modules/，镜像内不再有 .ts 源码
RUN rm -rf src test

# 如果端口更换，这边可以更新一下
EXPOSE 8001

CMD ["npm", "run", "start"]
