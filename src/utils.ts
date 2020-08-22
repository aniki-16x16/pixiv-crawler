export function concurrent(
  data: any[],
  op: (data: any) => Promise<any>,
  limit: number,
  lifeCycle?: {
    before?: (rawData: any, index: number) => any;
    after?: (rawResult: any, data: any, index: number) => any;
    error?: (err: Error, data: any, index: number) => boolean;
  }
): Promise<any[]>;
export function concurrent(
  data: Function,
  op: (data: any) => Promise<any>,
  limit: number,
  lifeCycle?: {
    before?: (rawData: any, index: number) => any;
    after?: (rawResult: any, data: any, index: number) => any;
    error?: (err: Error, data: any, index: number) => boolean;
  }
): Promise<any[]>;

/**
 * @description 控制异步并发，失败时能够自动重试
 * @param data 输入的数据，可以传递一个generator函数
 * @param op 执行的异步操作
 * @param limit 并发量
 * @param lifeCycle 生命周期各个阶段执行的函数
 * @returns 返回Promise，当所有异步操作都完成后resolve
 */
export function concurrent(
  data: any[] | Function,
  op: (data: any) => Promise<any>,
  limit: number,
  lifeCycle?: {
    before?: (rawData: any, index: number) => any;
    after?: (rawResult: any, data: any, index: number) => any;
    error?: (err: Error, data: any, index: number) => boolean;
  }
) {
  return new Promise((resolve) => {
    let result = [];
    let count = 0;
    let remain = 0;
    let dataIsArray = Array.isArray(data);
    let _generator: Generator = dataIsArray ? null : (data as Function)();
    let tmp = dataIsArray ? data : _generator.next().value;

    let addTask = function (value, _count = count) {
      let modifiedValue = value;
      if (lifeCycle?.before) {
        modifiedValue = lifeCycle.before(value, _count);
      }
      let req = op(modifiedValue);
      req
        .then((taskResult) => {
          remain--;
          if (lifeCycle?.after) {
            taskResult = lifeCycle.after(taskResult, value, _count);
          }
          if (dataIsArray) {
            result[_count] = taskResult;
            if (count >= (data as any[]).length) {
              if (remain <= 0) return resolve(result);
              return;
            }
          }
          addTaskWrapper(data[count]);
          count++;
          remain++;
        })
        .catch((err) => {
          if (lifeCycle?.error && lifeCycle.error(err, value, _count)) {
            addTaskWrapper(data[_count]);
          } else {
            addTaskWrapper(data[count]);
          }
        });
    };
    let addTaskWrapper = (value) => {
      if (dataIsArray) {
        addTask(value);
      } else {
        addTask(tmp);
        tmp = _generator.next().value;
      }
    };

    for (
      let i = 0;
      (i < limit && dataIsArray && i < data.length) ||
      (!dataIsArray && i < limit);
      i++
    ) {
      addTaskWrapper(data[i]);
      count++;
      remain++;
    }
  });
}

/**
 * @description 返回位于[m, n)区间内的整数
 */
export function randInt(m: number, n: number) {
  if (m > n) [m, n] = [n, m];
  return Math.floor(Math.random() * (n - m)) + m;
}
