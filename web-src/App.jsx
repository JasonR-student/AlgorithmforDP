import AIChatBot from './components/AIChatBot.jsx';
import DpVisualizer from './components/DpVisualizer.jsx';
import Navbar from './components/Navbar.jsx';
import { APP_VERSION } from './config/version.js';
import ControlPanel from './features/control/ControlPanel.jsx';
import CoreResultsView from './features/core/CoreResultsView.jsx';
import AlgorithmDocsView from './features/docs/AlgorithmDocsView.jsx';
import LongTextDialog from './features/longText/LongTextDialog.jsx';
import PerformanceView from './features/performance/PerformanceView.jsx';
import ReferenceReaderPage from './features/references/ReferenceReaderPage.jsx';
import ReferencesView from './features/references/ReferencesView.jsx';
import StandaloneVisualPage from './features/visual/StandaloneVisualPage.jsx';
import { useVisualizerState } from './hooks/useVisualizerState.js';

/**
 * 应用总入口。
 * 这里只负责根据路由和当前标签选择功能组件，具体状态和业务动作交给 useVisualizerState。
 */
export default function App() {
  const model = useVisualizerState();

  if (model.currentView === 'visual-full') {
    return (
      <StandaloneVisualPage
        str1={model.str1}
        str2={model.str2}
        status={model.status}
        showDp={model.showDp}
        result={model.result}
        onStr1Change={model.setStr1}
        onStr2Change={model.setStr2}
        onShowDpChange={model.setShowDp}
        onPreset={model.applyPreset}
        onCalculate={() => model.calculate()}
        onGenerateRandom={model.generateRandom}
      />
    );
  }

  if (model.currentView === 'reference') {
    return <ReferenceReaderPage reference={model.readerReference} context={model.referenceContext(model.readerReference)} />;
  }

  const views = {
    core: <CoreResultsView result={model.result} str1={model.str1} str2={model.str2} onShowVisual={() => model.setActive('visual')} />,
    visual: (
      <section className="page-panel page-enter page-enter-soft">
        <DpVisualizer result={model.result} onOpenStandalone={model.openStandaloneVisual} />
      </section>
    ),
    perf: <PerformanceView perfRows={model.perfRows} onRunPerf={model.runPerf} />,
    docs: (
      <AlgorithmDocsView
        docTopic={model.docTopic}
        docStep={model.docStep}
        result={model.result}
        str1={model.str1}
        str2={model.str2}
        onSelectTopic={model.selectDocTopic}
        onSelectStep={model.setDocStep}
        onShowVisual={() => model.setActive('visual')}
        onOpenChat={() => model.setChatOpen(true)}
      />
    ),
    refs: (
      <ReferencesView
        selectedRef={model.selectedRef}
        refMode={model.refMode}
        onRefModeChange={model.setRefMode}
        onSelectRef={model.setSelectedRef}
        onOpenReference={model.openReference}
        onAskAi={(item) => {
          model.setSelectedRef(item);
          model.setChatOpen(true);
        }}
      />
    ),
  };

  return (
    <div className="app-shell">
      <Navbar active={model.active} onChange={model.setActive} onOpenChat={() => model.setChatOpen(true)} />
      <main className="main-grid">
        <ControlPanel
          str1={model.str1}
          str2={model.str2}
          minLen={model.minLen}
          maxLen={model.maxLen}
          status={model.status}
          showDp={model.showDp}
          fileInputRef={model.fileInputRef}
          onStr1Change={model.setStr1}
          onStr2Change={model.setStr2}
          onMinLenChange={model.setMinLen}
          onMaxLenChange={model.setMaxLen}
          onShowDpChange={model.setShowDp}
          onPreset={model.applyPreset}
          onCalculate={() => model.calculate()}
          onOpenLongText={() => model.setLongOpen(true)}
          onGenerateRandom={model.generateRandom}
          onImportFile={model.importFile}
          onExportFile={model.exportFile}
        />

        <section className="workspace">{views[model.active]}</section>
      </main>

      {model.longOpen ? (
        <LongTextDialog str1={model.str1} str2={model.str2} onClose={() => model.setLongOpen(false)} onOpenStandalone={model.openStandaloneVisual} />
      ) : null}

      <footer className="site-footer">
        <span>Copyright 2026 任正江 | JasonRhan. All rights reserved.</span>
        <span>LCS&SCS Visualizer {APP_VERSION}</span>
      </footer>

      <AIChatBot isOpen={model.chatOpen} setIsOpen={model.setChatOpen} context={model.context} />
    </div>
  );
}
