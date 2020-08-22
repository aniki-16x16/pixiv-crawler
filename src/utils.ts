interface _ChunkFullfilled {
  (data: any[]): Promise<any>;
}

export function concurrent(
  data: any[],
  op: (data, addToChunk?: Function) => Promise<any>,
  limit: number,
  options?: {
    retry?: boolean;
    chunk?: {
      size: number;
      fullfilled: _ChunkFullfilled;
      sort?: (a, b) => number
    };
  }
): Promise<any[]>;
export function concurrent(
  data: Function,
  op: (data, addToChunk?: Function) => Promise<any>,
  limit: number,
  options?: {
    retry?: boolean;
    chunk?: {
      size: number;
      fullfilled: _ChunkFullfilled;
      sort?: (a, b) => number
    };
  }
): Promise<any[]>;
/**
 * @description 控制异步并发，失败时能够自动重试
 * @param data 输入的数据，可以传递一个generator函数
 * @param op 执行的异步操作
 * @param limit 并发量
 * @returns 返回Promise，当所有异步操作都完成后resolve
 */
export function concurrent(
  data: any[] | Function,
  op: (data, addToChunk?: Function) => Promise<any>,
  limit: number,
  options: {
    retry?: boolean;
    chunk?: {
      size: number;
      fullfilled: _ChunkFullfilled;
      sort?: (a, b) => number
    };
  } = {}
) {
  return new Promise((resolve) => {
    let count = 0;
    let remain = 0;
    const result = [];
    const dataIsArray = Array.isArray(data);
    const _generator: Generator = dataIsArray ? null : (data as Function)();
    let tmp = dataIsArray ? data : _generator.next().value;
    const {
      retry,
      chunk: { size: chunkSize, fullfilled: ChunkFullfilled, sort: chunkSort },
    } = options;
    const chunk = [];

    let addToChunk = async (value) => chunk.push(value);

    const addTask = (value, _count = count) => {
      const req = op(value, chunkSize > 0 ? addToChunk : null);
      req
        .then(async (taskResult) => {
          if (chunk.length >= chunkSize) {
            await ChunkFullfilled(chunkSort ? chunk.sort(chunkSort) : chunk);
            chunk.length = 0;
          }

          remain--;
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
        .catch(() => {
          if (retry) {
            addTaskWrapper(data[_count]);
          } else {
            addTaskWrapper(data[count]);
            count++;
            remain++;
          }
        });
    };
    const addTaskWrapper = (value) => {
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
