/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  namespace Common {
    /** common params of paginating */
    interface PaginatingCommonParams {
      /** current page number */
      current: number;
      /** page size */
      size: number;
      /** total count */
      total: number;
    }

    /** common params of paginating query list data */
    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      records: T[];
    }

    /**
     * 后端 PageResponse\<T\>（admin 后端统一分页响应，**原始 wire 结构**）
     *
     * - `items`: 当前页数据
     * - `total`: 总条数——后端 Long **序列化为字符串**（如 `"5"`），故类型为 `string | number`；
     *   消费侧（`defaultTransform`）用 `Number()` 归一化为数字
     * - `page`:  当前页（**请求与响应均 1-based**，调用方直传无需换算；±1 换算唯一收 cartisan-boot）
     * - `size`:  页大小
     */
    interface PageResponse<T = any> {
      items: T[];
      total: string | number;
      /** 1-based（请求与响应均 1-based） */
      page: number;
      size: number;
    }

    /** common search params of table */
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '1' | '2';

    /** common record */
    type CommonRecord<T = any> = {
      /** record id */
      id: number;
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
      /** record status */
      status: EnableStatus | null;
    } & T;
  }
}
