import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { init, WASI } from '@wasmer/wasi';

let wasmBuffer: Buffer;
let wasmInstance: WebAssembly.Instance | null = null;
let wasmModule: WebAssembly.Module | null = null;

export async function initWasm() {
  if (wasmInstance) return wasmInstance;

  await init();
  wasmBuffer = readFileSync(resolve(__dirname, './guard.wasm'));
  wasmModule = await WebAssembly.compile(wasmBuffer);

  // 创建WASI实例
  const wasi = new WASI({});

  // 使用WASI环境实例化WASM模块
  wasmInstance = await wasi.instantiate(wasmModule, {});
  return wasmInstance;
}

// 确保在模块加载时初始化
let initPromise: Promise<WebAssembly.Instance> | null = null;

async function wbus(input: any) {
  // 确保WASM已初始化
  if (!initPromise) {
    initPromise = initWasm();
  }

  const instance = await initPromise;
  const wasi = new WASI({});

  // 重新实例化用于执行
  const executionInstance = await wasi.instantiate(wasmModule!, {});

  wasi.setStdinString(JSON.stringify(input));

  const exitCode = wasi.start();
  const stdout = wasi.getStdoutString();
  const result = JSON.parse(stdout);

  // console.log(`[CODE: ${exitCode}]`, result)

  return result;
}

function formatUrl(url: any): string {
  if (!url) return url;

  try {
    if (typeof url === 'object' && url instanceof URL) {
      return url.toString();
    }

    url = url.trim();

    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    if (url.startsWith('/')) {
      return 'https://market.waimai.meituan.com' + url;
    }

    return url;
  } catch {
    return url;
  }
}

async function genMetaData(actUrl: string, version: string) {
  const { data } = await wbus({
    method: 'genMetaData',
    args: [actUrl, version],
  });

  return data;
}

async function getH5Dfp(metaData: any, version: string) {
  const { data } = await wbus({
    method: 'getH5Dfp',
    args: [metaData, version],
  });

  return data;
}

async function getH5Fp(url: string) {
  const { data } = await wbus({
    method: 'getH5Fp',
    args: [url],
  });

  return data;
}

async function getReqSig(reqOpt: any) {
  const { data } = await wbus({
    method: 'getReqSig',
    args: [reqOpt],
  });

  return data;
}

async function getMtgSig(reqSig: any, guardCtx: any) {
  try {
    const { data } = await wbus({
      method: 'getMtgSig',
      args: [reqSig, guardCtx],
    });
    return data;
  } catch (e) {
    console.log(e);
  }
}

export { formatUrl, getH5Fp, getH5Dfp, genMetaData, getMtgSig, getReqSig };
