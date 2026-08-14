import * as path from 'path';
import * as os from 'os';
import * as md5 from 'md5';
import * as fs from 'fs';

/**
 * 获得配置文件中的 keys。
 * 注意：config.default.ts 的 keys 已改为 env 驱动（process.env.MIDWAY_KEYS || 默认值），
 * 编译后形如 `keys: process.env.MIDWAY_KEYS || '...'`，不能用正则解析字面量。
 * 这里直接读同一来源，保证与 config 一致。
 * @returns
 */
const getKeys = () => process.env.MIDWAY_KEYS || '9cbe2380-877b-4fa9-b9fd-33a27c2e7486';

/**
 * 项目数据目录
 * @returns
 */
export const pDataPath = () => {
  const dirPath = path.join(os.homedir(), '.cool-admin', md5(getKeys()));
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

/**
 * 上传目录
 * @returns
 */
export const pUploadPath = () => {
  const uploadPath = path.join(pDataPath(), 'upload');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

/**
 * 插件目录
 * @returns
 */
export const pPluginPath = () => {
  const pluginPath = path.join(pDataPath(), 'plugin');
  if (!fs.existsSync(pluginPath)) {
    fs.mkdirSync(pluginPath, { recursive: true });
  }
  return pluginPath;
};

/**
 * sqlite 数据库文件
 */
export const pSqlitePath = () => {
  return path.join(pDataPath(), 'cool.sqlite');
};

/**
 * 缓存目录
 * @returns
 */
export const pCachePath = () => {
  return path.join(pDataPath(), 'cache');
};
