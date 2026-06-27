/**
 * 为独立文献阅读页构造更聚焦的问答上下文。
 * 这样右侧问答能够围绕当前论文，而不是泛泛讨论整个项目。
 */
export function buildReferenceContext(baseContext, item) {
  return {
    ...baseContext,
    mode: '文献讲解',
    chatScope: 'lcs_scs_reference',
    pageTitle: `${item.titleZh} | 文献阅读`,
    referenceTitleEn: item.titleEn,
    referenceTitleZh: item.titleZh,
    referenceAuthors: item.authors,
    referenceVenue: item.venue,
    referenceHref: item.href,
    referenceSummary: item.summary,
    referenceReplicatedIn: item.replicatedIn,
    referenceMethodUse: item.methodUse,
    referenceMethodSteps: item.methodSteps,
  };
}
