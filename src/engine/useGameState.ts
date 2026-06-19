import { useState, useCallback, useMemo } from 'react';
import { Level, OpticalElement, Room, RGB } from '../types';
import { LEVELS } from '../levels';
import { traceAllRays, checkLevelSolved, RayTraceResult } from './raycaster';

export function useGameState() {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState<Level>(() =>
    JSON.parse(JSON.stringify(LEVELS[0]))
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const traceResult: RayTraceResult = useMemo(() => {
    return traceAllRays(levelData);
  }, [levelData]);

  const isSolved = useMemo(() => {
    return checkLevelSolved(levelData, traceResult.activatedReceivers);
  }, [levelData, traceResult]);

  const currentLevel = LEVELS[currentLevelIdx];

  const resetLevel = useCallback(() => {
    const fresh = JSON.parse(JSON.stringify(currentLevel));
    setLevelData(fresh);
    setSelectedElementId(null);
  }, [currentLevel]);

  const goToLevel = useCallback((idx: number) => {
    if (idx < 0 || idx >= LEVELS.length) return;
    setCurrentLevelIdx(idx);
    const fresh = JSON.parse(JSON.stringify(LEVELS[idx]));
    setLevelData(fresh);
    setSelectedElementId(null);
  }, []);

  const rotateElement = useCallback((elementId: string, delta: number = 15) => {
    setLevelData((prev) => {
      const next: Level = JSON.parse(JSON.stringify(prev));
      for (const room of next.rooms) {
        for (const el of room.elements) {
          if (el.id === elementId && el.rotatable) {
            el.rotation = (el.rotation + delta) % 360;
            if (el.rotation < 0) el.rotation += 360;
          }
        }
      }
      return next;
    });
  }, []);

  const getElementById = useCallback((id: string): { el: OpticalElement; room: Room } | null => {
    for (const room of levelData.rooms) {
      for (const el of room.elements) {
        if (el.id === id) return { el, room };
      }
    }
    return null;
  }, [levelData]);

  return {
    levelData,
    currentLevelIdx,
    totalLevels: LEVELS.length,
    currentLevelName: currentLevel.name,
    currentLevelDescription: currentLevel.description,
    traceResult,
    isSolved,
    selectedElementId,
    setSelectedElementId,
    resetLevel,
    goToLevel,
    rotateElement,
    getElementById,
  };
}
