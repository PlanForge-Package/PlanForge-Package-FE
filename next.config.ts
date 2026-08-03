import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * 컨테이너 배포용 출력. 실제로 쓰이는 의존성만 추려 담아 런타임 이미지를 작게 만든다.
   *
   * 항상 켜지 않는 이유: standalone 은 node_modules 를 심볼릭 링크로 옮기는데,
   * Windows 는 개발자 모드나 관리자 권한 없이는 심볼릭 링크를 만들지 못해
   * `pnpm build` 가 EPERM 으로 실패한다. Dockerfile 이 이 값을 켠다.
   */
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,

  // 응답 헤더에 프레임워크와 버전을 광고하지 않는다.
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_APP_NAME: 'PlanForge',
  },
};

export default nextConfig;
