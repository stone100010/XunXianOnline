import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@xunxian/shared", "@xunxian/engine", "@xunxian/content"],
  webpack: (config) => {
    // 工作区 TS 包使用 ESM 风格 `.js` 后缀导入，映射回 `.ts` 源码
    config.resolve.extensionAlias = { ".js": [".ts", ".js"] };
    return config;
  },
};

export default nextConfig;
