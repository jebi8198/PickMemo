import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    // 이 프로젝트의 루트를 명시적으로 지정 (상위 폴더의 lockfile 오탐 방지)
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
