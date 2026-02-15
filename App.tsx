import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import HomePage from './components/HomePage';
import { InferenceArena } from './components/InferenceArena';
import { ImpostersGame } from './components/ImpostersGame';
import { IntroAnimation } from './components/IntroAnimation';
import { DemonBridge } from './components/DemonBridge';
import { ShadowFighter } from './components/ShadowFighter';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/imposters" element={<ImpostersGame />} />
          <Route path="/shadow" element={<InferenceArena />} />
          <Route path="/demon" element={<DemonBridge />} />
          <Route path="/fighter" element={<ShadowFighter />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
