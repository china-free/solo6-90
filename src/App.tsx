import React, { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ControlPanel } from './components/ControlPanel';
import { useGameState } from './engine/useGameState';

function App() {
  const game = useGameState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        game.resetLevel();
      }
      if (e.key === 'ArrowLeft' && game.selectedElementId) {
        game.rotateElement(game.selectedElementId, -15);
      }
      if (e.key === 'ArrowRight' && game.selectedElementId) {
        game.rotateElement(game.selectedElementId, 15);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game]);

  const selected = game.selectedElementId
    ? game.getElementById(game.selectedElementId)?.el ?? null
    : null;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#050510',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          overflow: 'hidden',
        }}
      >
        <GameCanvas
          level={game.levelData}
          traceResult={game.traceResult}
          selectedElementId={game.selectedElementId}
          onSelectElement={game.setSelectedElementId}
          onRotateElement={game.rotateElement}
          solved={game.isSolved}
        />
      </div>

      <ControlPanel
        levelName={game.currentLevelName}
        levelDescription={game.currentLevelDescription}
        currentLevelIdx={game.currentLevelIdx}
        totalLevels={game.totalLevels}
        selectedElement={selected}
        isSolved={game.isSolved}
        onReset={game.resetLevel}
        onPrevLevel={() => game.goToLevel(game.currentLevelIdx - 1)}
        onNextLevel={() => game.goToLevel(game.currentLevelIdx + 1)}
        onRotateLeft={() =>
          game.selectedElementId && game.rotateElement(game.selectedElementId, -15)
        }
        onRotateRight={() =>
          game.selectedElementId && game.rotateElement(game.selectedElementId, 15)
        }
      />
    </div>
  );
}

export default App;
