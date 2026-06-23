let wasmInstancePromise = null;

/**
 * 把 exe 内联 HTML 中注入的 base64 Wasm 转成字节数组。
 * 桌面端单文件版本不走网络请求，因此需要这个解码入口。
 */
function decodeBase64Wasm(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * 加载 Wasm 模块。
 * 桌面端优先使用内联 base64，网页端则从 public/lcs_scs.wasm 拉取。
 */
async function loadWasm() {
  if (window.__LCS_SCS_WASM_BASE64__) {
    const bytes = decodeBase64Wasm(window.__LCS_SCS_WASM_BASE64__);
    return WebAssembly.instantiate(bytes, {});
  }

  const response = await fetch('/lcs_scs.wasm');
  if (!response.ok) throw new Error('无法加载 lcs_scs.wasm');
  const bytes = await response.arrayBuffer();
  return WebAssembly.instantiate(bytes, {});
}

/**
 * 获取并缓存 Wasm 实例。
 * 缓存 Promise 可以避免多个组件同时触发重复加载。
 */
async function getWasm() {
  if (!wasmInstancePromise) wasmInstancePromise = loadWasm();
  return wasmInstancePromise;
}

/**
 * 将 JavaScript 字符串编码为 Wasm 可处理的 1 字节码。
 * 同时保留 codeToChar 映射，便于计算后恢复原始字符。
 */
function encodePair(str1, str2) {
  const chars1 = Array.from(str1);
  const chars2 = Array.from(str2);
  const charToCode = new Map();
  const codeToChar = [''];

  for (const ch of [...chars1, ...chars2]) {
    if (!charToCode.has(ch)) {
      if (codeToChar.length >= 256) {
        throw new Error('当前 Wasm 版本最多支持 255 种不同字符；请缩小字符集或使用英文/数字样例。');
      }
      charToCode.set(ch, codeToChar.length);
      codeToChar.push(ch);
    }
  }

  return {
    chars1,
    chars2,
    codeToChar,
    codes1: Uint8Array.from(chars1.map((ch) => charToCode.get(ch))),
    codes2: Uint8Array.from(chars2.map((ch) => charToCode.get(ch))),
  };
}

/**
 * 根据完整 DP 表构造前端动画步骤。
 * 大表格超过 limit 时返回空数组，避免动画步骤过多拖慢页面。
 */
function makeFillSteps(chars1, chars2, dp, rows, cols, limit = 12000) {
  if ((rows - 1) * (cols - 1) > limit) return [];
  const steps = [];
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const equal = chars1[i - 1] === chars2[j - 1];
      const fromI = equal ? i - 1 : dp[(i - 1) * cols + j] >= dp[i * cols + j - 1] ? i - 1 : i;
      const fromJ = equal ? j - 1 : dp[(i - 1) * cols + j] >= dp[i * cols + j - 1] ? j : j - 1;
      steps.push({
        i,
        j,
        fromI,
        fromJ,
        value: dp[i * cols + j],
        rule: equal ? '字符相同：dp[i][j]=dp[i-1][j-1]+1' : '字符不同：取上方和左方较大值',
      });
    }
  }
  return steps;
}

/**
 * 按需把 Wasm 内存中的 DP 表复制为二维数组。
 * includeTable=false 或表格过大时跳过复制，适合性能测试和长文本场景。
 */
function readTable(dpView, rows, cols, includeTable) {
  if (!includeTable || rows * cols > 90000) return [];
  const table = [];
  for (let i = 0; i < rows; i += 1) {
    table.push(Array.from(dpView.slice(i * cols, i * cols + cols)));
  }
  return table;
}

/**
 * 将字节数格式化为 B/KB/MB。
 * 用于错误提示、核心结果卡片和算法说明区。
 */
function bytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 执行一次完整的 LCS/SCS 计算。
 * 该函数负责内存分配、调用 C++ 导出的 Wasm 函数、读取结果和组装前端数据结构。
 */
export async function computeAll(str1, str2, options = {}) {
  const { instance } = await getWasm();
  const exports = instance.exports;
  const memory = exports.memory;
  const encoded = encodePair(str1, str2);
  const m = encoded.codes1.length;
  const n = encoded.codes2.length;
  const rows = m + 1;
  const cols = n + 1;
  const cells = rows * cols;
  const dpBytes = cells * 4;
  const rowBytes = (n + 1) * 2 * 4;
  const hirschbergBytes = (n + 1) * 4 * 4;
  const pathBytes = (m + n + 2) * 2 * 4;
  const scsBytes = m + n + 2;
  const required = m + n + dpBytes + rowBytes + hirschbergBytes + pathBytes + scsBytes * 2 + 1024;

  if (required > memory.buffer.byteLength - 65536) {
    throw new Error(`当前输入需要约 ${bytes(required)} Wasm 内存，已超过浏览器安全演示上限。`);
  }

  exports.wasm_reset();
  const aPtr = exports.wasm_alloc(m || 1);
  const bPtr = exports.wasm_alloc(n || 1);
  const dpPtr = exports.wasm_alloc(dpBytes || 4);
  const rowPtr = exports.wasm_alloc(rowBytes || 8);
  const seqPtr = exports.wasm_alloc(Math.max(m, n, 1) + 1);
  const hirschbergSeqPtr = exports.wasm_alloc(Math.max(m, n, 1) + 1);
  const hirschbergWorkPtr = exports.wasm_alloc(hirschbergBytes || 16);
  const pathPtr = exports.wasm_alloc(pathBytes || 8);
  const scsPtr = exports.wasm_alloc(scsBytes);
  const sourcePtr = exports.wasm_alloc(scsBytes);

  const u8 = new Uint8Array(memory.buffer);
  u8.set(encoded.codes1, aPtr);
  u8.set(encoded.codes2, bPtr);

  const t0 = performance.now();
  const lcsLength = exports.lcs_dp(aPtr, m, bPtr, n, dpPtr);
  const t1 = performance.now();
  const optimizedLength = exports.lcs_rolling(aPtr, m, bPtr, n, rowPtr);
  const t2 = performance.now();
  const hirschbergLength = exports.lcs_hirschberg(aPtr, m, bPtr, n, hirschbergSeqPtr, hirschbergWorkPtr, n);
  const t3 = performance.now();

  const dpView = new Int32Array(memory.buffer, dpPtr, cells);
  const packed = exports.lcs_backtrack(aPtr, m, bPtr, n, dpPtr, seqPtr, pathPtr) >>> 0;
  const pathCount = packed >>> 16;
  const sequenceLength = packed & 0xffff;
  const scsLength = exports.scs_construct(aPtr, m, bPtr, n, dpPtr, scsPtr, sourcePtr);

  const lcsCodes = Array.from(new Uint8Array(memory.buffer, seqPtr, sequenceLength));
  const hirschbergCodes = Array.from(new Uint8Array(memory.buffer, hirschbergSeqPtr, hirschbergLength));
  const scsCodes = Array.from(new Uint8Array(memory.buffer, scsPtr, scsLength));
  const scsSources = Array.from(new Uint8Array(memory.buffer, sourcePtr, scsLength));
  const pathView = new Int32Array(memory.buffer, pathPtr, pathCount * 2);
  const backtrackPath = [];
  for (let index = 0; index < pathCount; index += 1) {
    backtrackPath.push({ i: pathView[index * 2], j: pathView[index * 2 + 1] });
  }

  const brute =
    m + n <= 22
      ? (() => {
          const start = performance.now();
          const length = exports.lcs_bruteforce_length(aPtr, m, bPtr, n);
          return { length, timeUs: Math.max(1, Math.round((performance.now() - start) * 1000)), skipped: false };
        })()
      : { length: null, timeUs: 0, skipped: true };

  const includeTable = options.includeTable !== false;
  const dpTable = readTable(dpView, rows, cols, includeTable);
  const fillSteps = makeFillSteps(encoded.chars1, encoded.chars2, dpView, rows, cols);

  return {
    lcs: {
      str1,
      str2,
      length: lcsLength,
      optimizedLength,
      hirschbergLength,
      sequence: lcsCodes.map((code) => encoded.codeToChar[code] || '').join(''),
      hirschbergSequence: hirschbergCodes.map((code) => encoded.codeToChar[code] || '').join(''),
      timeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      optimizedTimeUs: Math.max(1, Math.round((t2 - t1) * 1000)),
      hirschbergTimeUs: Math.max(1, Math.round((t3 - t2) * 1000)),
      memoryBytes: dpBytes,
      optimizedMemoryBytes: rowBytes,
      hirschbergMemoryBytes: hirschbergBytes,
      dpTable,
      backtrackPath,
      fillSteps,
      bruteForceLength: brute.length,
      bruteForceTimeUs: brute.timeUs,
      bruteForceSkipped: brute.skipped,
    },
    scs: {
      str1,
      str2,
      length: scsLength,
      sequence: scsCodes.map((code) => encoded.codeToChar[code] || '').join(''),
      sources: scsSources.map((source) => (source === 0 ? 'common' : source === 1 ? 's1' : 's2')),
      memoryBytes: dpBytes,
    },
  };
}

/**
 * 运行固定阶梯的批量性能测试。
 * 每个长度重复多次取平均，减少浏览器计时抖动对趋势图的影响。
 */
export async function runPerformanceTest({ maxLen = 1000, step = 200, repeat = 3 } = {}) {
  const rows = [];
  for (let len = step; len <= maxLen; len += step) {
    let standard = 0;
    let optimized = 0;
    let hirschberg = 0;
    let standardMemory = 0;
    let optimizedMemory = 0;
    let hirschbergMemory = 0;
    for (let r = 0; r < repeat; r += 1) {
      const str1 = 'ABCD'.repeat(Math.ceil(len / 4)).slice(0, len);
      const str2 = 'BCDA'.repeat(Math.ceil(len / 4)).slice(0, len);
      const result = await computeAll(str1, str2, { includeTable: false });
      standard += result.lcs.timeUs;
      optimized += result.lcs.optimizedTimeUs;
      hirschberg += result.lcs.hirschbergTimeUs;
      standardMemory = result.lcs.memoryBytes;
      optimizedMemory = result.lcs.optimizedMemoryBytes;
      hirschbergMemory = result.lcs.hirschbergMemoryBytes;
    }
    rows.push({
      length: len,
      standardTimeUs: Math.round(standard / repeat),
      optimizedTimeUs: Math.round(optimized / repeat),
      hirschbergTimeUs: Math.round(hirschberg / repeat),
      standardMemoryBytes: standardMemory,
      optimizedMemoryBytes: optimizedMemory,
      hirschbergMemoryBytes: hirschbergMemory,
      theory: len * len,
    });
  }
  return rows;
}

/**
 * 暴露给 UI 使用的字节格式化函数。
 * 外部组件不需要知道内部 bytes 函数的默认值处理细节。
 */
export function formatBytes(value) {
  return bytes(value || 0);
}
