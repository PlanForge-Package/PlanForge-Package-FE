import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 서버 컴포넌트에서 Core(API Server)로 프록시할 때 사용.
  env: {
    NEXT_PUBLIC_APP_NAME: 'PlanForge',
  },
};

export default nextConfig;
