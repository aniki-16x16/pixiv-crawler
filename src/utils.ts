interface _ConcurrentPipelines {
  onChunkFullfilled: (chunk: any[]) => Promise<void>;
  success?: (data: any) => any;
  error?: (err: any, data: any) => void;
}
export class Concurrent {
  #op: (data: any) => Promise<any>;
  #limit: number;
  #nextAble: Generator;
  #count = 0;
  #chunk = [];
  #chunkSize: number;
  #options: {
    retry: boolean;
  };
  #pipelines: _ConcurrentPipelines;

  constructor(data: Function, op: (data: any) => Promise<any>, limit: number, chunkSize: number, retry = true) {
    this.#nextAble = data();
    this.#op = op;
    this.#limit = limit;
    this.#chunkSize = chunkSize;
    this.#options = { retry };
  }

  start(): Promise<any> {
    if (!this.#pipelines?.onChunkFullfilled)
      throw new Error("未设置onChunkFullfilled");

    const { retry } = this.#options;
    const addToChunk = async (data) => {
      this.#chunk.push(data);
      if (this.#chunk.length >= this.#chunkSize) {
        let tmp = this.#chunk.concat();
        this.#chunk.length = 0;
        await this.#pipelines.onChunkFullfilled(tmp);
      }
    };
    const addTask = (data, _count = this.#count) => {
      const req = this.#op(data);
      req
        .then(async (result) => {
          await addToChunk(
            this.#pipelines?.success ? this.#pipelines.success(result) : result
          );
          addTask(this.#nextAble.next().value);
          this.#count++;
        })
        .catch((err) => {
          if (this.#pipelines?.error) {
            this.#pipelines.error(err, data);
          }
          if (retry) {
            addTask(data);
          } else {
            addTask(this.#nextAble.next().value);
            this.#count++;
          }
        });
    };
    return new Promise((resolve, reject) => {
      for (let i = 0; i < this.#limit; i++) {
        addTask(this.#nextAble.next().value);
        this.#count++;
      }
    });
  }

  setPipeline(pipeline: _ConcurrentPipelines) {
    const { onChunkFullfilled, success: after, error } = pipeline;
    this.#pipelines = { onChunkFullfilled, success: after, error };
    return this;
  }
}

/**
 * @description 返回位于[m, n)区间内的整数
 */
export function randInt(m: number, n: number) {
  if (m > n) [m, n] = [n, m];
  return Math.floor(Math.random() * (n - m)) + m;
}

export function classifyObjArr(
  objArr: object[],
  prop: string
): { [key: string]: any[] } {
  const result = {};
  for (const obj of objArr) {
    if (result[obj[prop]]) {
      result[obj[prop]].push(obj);
    } else {
      result[obj[prop]] = [obj];
    }
  }
  return result;
}
