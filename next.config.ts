import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 도커 배포용: 실행에 필요한 파일만 포함한 최소 번들 생성
  output: 'standalone',

  // 개발 환경 전용 설정
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
  }),
};

export default nextConfig;
