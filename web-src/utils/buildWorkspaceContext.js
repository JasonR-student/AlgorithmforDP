/**
 * 构造问答区需要的当前实验上下文。
 * 所有字段都保持简短，便于后端代理限制输入体积并保护页面性能。
 */
export function buildWorkspaceContext({ str1, str2, result, selectedRef, readerReference }) {
  return {
    str1Length: Array.from(str1).length,
    str2Length: Array.from(str2).length,
    lcsLength: result?.lcs?.length || 0,
    scsLength: result?.scs?.length || 0,
    standardTimeUs: result?.lcs?.timeUs || 0,
    optimizedTimeUs: result?.lcs?.optimizedTimeUs || 0,
    hirschbergTimeUs: result?.lcs?.hirschbergTimeUs || 0,
    standardMemoryBytes: result?.lcs?.memoryBytes || 0,
    optimizedMemoryBytes: result?.lcs?.optimizedMemoryBytes || 0,
    hirschbergMemoryBytes: result?.lcs?.hirschbergMemoryBytes || 0,
    lcsPreview: result?.lcs?.sequence || '',
    scsPreview: result?.scs?.sequence || '',
    referenceTitleEn: selectedRef?.titleEn || readerReference?.titleEn || '',
    referenceTitleZh: selectedRef?.titleZh || readerReference?.titleZh || '',
    referenceAuthors: selectedRef?.authors || readerReference?.authors || '',
    referenceVenue: selectedRef?.venue || readerReference?.venue || '',
    referenceSummary: selectedRef?.summary || readerReference?.summary || '',
    referenceReplicatedIn: selectedRef?.replicatedIn || readerReference?.replicatedIn || '',
  };
}
