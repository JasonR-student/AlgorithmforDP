import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION } from '../config/version.js';
import { references } from '../data/references.js';
import { downloadText, generateResultFile, parseInputFile } from '../lib/fileCodec.js';
import { randomPair } from '../lib/randomText.js';
import { computeAll, runPerformanceTest } from '../lib/wasmClient.js';
import { buildReferenceContext } from '../utils/buildReferenceContext.js';
import { buildWorkspaceContext } from '../utils/buildWorkspaceContext.js';
import { getInitialTab } from '../utils/getInitialTab.js';
import { getRouteReferenceId } from '../utils/getRouteReferenceId.js';
import { getRouteView } from '../utils/getRouteView.js';
import { readVisualState } from '../utils/readVisualState.js';
import { storeVisualState } from '../utils/storeVisualState.js';

/**
 * 集中管理整个可视化实验台的状态和业务动作。
 * 页面组件只负责展示，计算、导入导出、打开独立页等动作都从这里传出。
 */
export function useVisualizerState() {
  const currentView = getRouteView();
  const savedVisualState = currentView === 'visual-full' ? readVisualState() : null;
  const readerReference = references.find((item) => item.id === getRouteReferenceId()) || references[0];
  const [active, setActive] = useState(getInitialTab);
  const [str1, setStr1] = useState(savedVisualState?.str1 || 'ABCBDAB');
  const [str2, setStr2] = useState(savedVisualState?.str2 || 'BDCABA');
  const [minLen, setMinLen] = useState(100);
  const [maxLen, setMaxLen] = useState(200);
  const [result, setResult] = useState(null);
  const [perfRows, setPerfRows] = useState([]);
  const [selectedRef, setSelectedRef] = useState(references[0]);
  const [refMode, setRefMode] = useState('grid');
  const [longOpen, setLongOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [status, setStatus] = useState('Wasm 模块准备中');
  const [showDp, setShowDp] = useState(savedVisualState?.showDp ?? true);
  const [docTopic, setDocTopic] = useState('lcs');
  const [docStep, setDocStep] = useState(0);
  const fileInputRef = useRef(null);

  const context = useMemo(
    () => buildWorkspaceContext({ str1, str2, result, selectedRef, active }),
    [active, result, selectedRef, str1, str2],
  );

  /**
   * 根据当前或指定输入运行 Wasm 算法。
   * includeTable 受 showDp 控制，长文本时可以关闭完整 DP 表以保护页面性能。
   */
  async function calculate(nextStr1 = str1, nextStr2 = str2) {
    setStatus('Wasm 计算中');
    try {
      const data = await computeAll(nextStr1, nextStr2, { includeTable: showDp });
      setResult(data);
      setStatus('Wasm 计算完成');
    } catch (error) {
      setStatus(error.message || '计算失败');
    }
  }

  useEffect(() => {
    calculate(str1, str2);
  }, []);

  /**
   * 应用一个预设样例并立即重新计算。
   * 预设格式固定为 [标签, S1, S2]，来自 config/presets.js。
   */
  function applyPreset(item) {
    setStr1(item[1]);
    setStr2(item[2]);
    calculate(item[1], item[2]);
  }

  /**
   * 生成指定长度范围内的随机字符串对。
   * 未传 range 时使用界面上的 minLen/maxLen 滑块值。
   */
  function generateRandom(range) {
    const [min, max] = range || [minLen, maxLen];
    const pair = randomPair(min, max);
    setStr1(pair.str1);
    setStr2(pair.str2);
    setStatus(`随机生成完成：S1 ${pair.str1.length} 位 / S2 ${pair.str2.length} 位`);
    calculate(pair.str1, pair.str2);
  }

  /**
   * 从本地文本文件读取输入字符串。
   * parseInputFile 兼容 str1= / str2= 格式，也兼容前两行直接作为输入。
   */
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = parseInputFile(await file.text());
    setStr1(parsed.str1);
    setStr2(parsed.str2);
    calculate(parsed.str1, parsed.str2);
    event.target.value = '';
  }

  /**
   * 导出当前输入、结果和性能测试数据。
   * 文件名跟随 APP_VERSION，便于桌面版和网页版报告对应。
   */
  function exportFile() {
    const content = generateResultFile({ str1, str2, result, perf: perfRows });
    downloadText(`lcs_scs_result_${APP_VERSION}.txt`, content);
  }

  /**
   * 批量运行固定长度阶梯的性能测试。
   * 结果会驱动 PerformanceView 中的图表、表格和自动分析结论。
   */
  async function runPerf() {
    setStatus('Wasm 批量性能测试中');
    const rows = await runPerformanceTest({ maxLen: 1000, step: 200, repeat: 3 });
    setPerfRows(rows);
    setStatus('性能测试完成');
  }

  /**
   * 打开独立动画页，并先把当前输入存入 localStorage。
   * 新页面用 query 参数 view=visual-full 进入顶部控制区 + 下方表格布局。
   */
  function openStandaloneVisual() {
    storeVisualState({ str1, str2, showDp });
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('view', 'visual-full');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  /**
   * 打开独立文献阅读页。
   * 主列表页不预览 PDF，只在新页面中加载 PDF 和右侧问答。
   */
  function openReference(item) {
    setSelectedRef(item);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('view', 'reference');
    url.searchParams.set('id', item.id);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  /**
   * 选择算法说明主题。
   * 切换主题时把步骤重置到第一步，避免旧步骤索引越界。
   */
  function selectDocTopic(id) {
    setDocTopic(id);
    setDocStep(0);
  }

  /**
   * 生成当前文献的问答上下文。
   * ReferenceReaderPage 会用它让右侧问答聚焦到正在阅读的论文。
   */
  function referenceContext(item) {
    return buildReferenceContext(context, item);
  }

  return {
    active,
    calculate,
    chatOpen,
    context,
    currentView,
    docStep,
    docTopic,
    fileInputRef,
    importFile,
    longOpen,
    maxLen,
    minLen,
    openReference,
    openStandaloneVisual,
    perfRows,
    readerReference,
    refMode,
    referenceContext,
    result,
    runPerf,
    selectedRef,
    setActive,
    setChatOpen,
    setDocStep,
    setLongOpen,
    setMaxLen,
    setMinLen,
    setRefMode,
    setSelectedRef,
    setShowDp,
    setStr1,
    setStr2,
    showDp,
    status,
    str1,
    str2,
    applyPreset,
    exportFile,
    generateRandom,
    selectDocTopic,
  };
}
