import type { AxiosResponse } from 'axios';
import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';
import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { $t } from '@/locales';
import { getAuthorization, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export const request = createFlatRequest(
  {
    baseURL
  },
  {
    defaultState: {
      errMsgStack: [],
      refreshTokenPromise: null
    } as RequestInstanceState,
    transform(response: AxiosResponse<App.Service.Response<any>>) {
      return response.data.data;
    },
    async onRequest(config) {
      const Authorization = getAuthorization();
      Object.assign(config.headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // 后端 ApiResponse.code 即 HTTP 状态码本身；200 表示成功。
      // 由 .env 的 VITE_SERVICE_SUCCESS_CODE 控制（设为 "200"）。
      return String(response.data.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE;
    },
    async onBackendFail(response, _instance) {
      const authStore = useAuthStore();
      const responseCode = String(response.data.code);

      function handleLogout() {
        authStore.resetStore();
      }

      function logoutAndCleanup() {
        handleLogout();
        window.removeEventListener('beforeunload', handleLogout);

        request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.message);
      }

      // 命中 logoutCodes（如 401）→ 登出。但登录接口自身的 401 是"账密错误"，
      // 不走登出、落到 onError 弹后端 message（避免错密码无任何提示）。
      const isLoginEndpoint = response.config.url?.includes('/auth/login');
      const logoutCodes = import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',') || [];
      if (!isLoginEndpoint && logoutCodes.includes(responseCode)) {
        handleLogout();
        return null;
      }

      // 命中 modalLogoutCodes → 弹窗提示后登出
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (modalLogoutCodes.includes(responseCode) && !request.state.errMsgStack?.includes(response.data.message)) {
        request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.message];

        // prevent the user from refreshing the page
        window.addEventListener('beforeunload', handleLogout);

        window.$dialog?.error({
          title: $t('common.error'),
          content: response.data.message,
          positiveText: $t('common.confirm'),
          maskClosable: false,
          closeOnEsc: false,
          onPositiveClick() {
            logoutAndCleanup();
          },
          onClose() {
            logoutAndCleanup();
          }
        });

        return null;
      }

      return null;
    },
    onError(error) {
      // 请求失败时展示错误信息
      let message = error.message;
      let backendErrorCode = '';

      // 后端业务错误：优先用 ApiResponse.message。
      // 后端约定 HTTP 状态码即 code——业务错（如登录账密错 401）以 HTTP 非 2xx 返回，走 error 拦截器，
      // 此时 error.response.data 已是 {code,message,...}；统一在此取后端 message，避免只显示 axios 通用串。
      const respData = error.response?.data;
      if (respData && typeof respData === 'object' && 'message' in respData) {
        message = respData.message || message;
        backendErrorCode = String(respData.code ?? '');
      }

      // modalLogout 错误已在 onBackendFail 弹窗，这里不重复
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (modalLogoutCodes.includes(backendErrorCode)) {
        return;
      }

      // 会话过期等（受保护接口命中 logoutCodes，如 401）→ 自动登出回登录页。
      // 登录接口自身的 401 是账密错，不登出、只弹 toast（见 ADR-0001）。
      // 注：后端业务错走 error 拦截器，onBackendFail 里的 logoutCodes 对我们是死代码，故在此处理。
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');
      const logoutCodes = import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',') || [];
      if (!isLoginEndpoint && logoutCodes.includes(backendErrorCode)) {
        useAuthStore().resetStore();
        return;
      }

      showErrorMsg(request.state, message);
    }
  }
);

export const demoRequest = createRequest(
  {
    baseURL: otherBaseURL.demo
  },
  {
    transform(response: AxiosResponse<App.Service.DemoResponse>) {
      return response.data.result;
    },
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    onError(error) {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
    }
  }
);
