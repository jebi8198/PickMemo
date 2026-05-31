import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 환경 전용 설정은 프로덕션 빌드에서 제외
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
  }),
};

export default nextConfig;
