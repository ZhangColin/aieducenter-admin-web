import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    // 超管（static 模式 isStaticSuper）后端 bypass 权限校验，故 /auth/current 返回的
    // permissions 为空。若不在此放行，超管会看不到任何写操作按钮（hasAuth 全 false）。
    if (authStore.isStaticSuper) {
      return true;
    }

    if (typeof codes === 'string') {
      return authStore.userInfo.buttons.includes(codes);
    }

    return codes.some(code => authStore.userInfo.buttons.includes(code));
  }

  return {
    hasAuth
  };
}
