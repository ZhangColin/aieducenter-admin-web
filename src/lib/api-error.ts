import { toast } from 'sonner'

/**
 * 提取接口错误的中文文案。http-client 抛出的 Error 已携带后端 `message`（中文文案），
 * 兜底非 Error 时用 fallback。对齐 CONTEXT「错误提示用后端 message」。
 */
export function errorMessage(err: unknown, fallback = '操作失败'): string {
  return err instanceof Error ? err.message : fallback
}

/** 弹出接口错误 toast（消息取自后端 message）。 */
export function toastApiError(err: unknown, fallback = '操作失败'): void {
  toast.error(errorMessage(err, fallback))
}
