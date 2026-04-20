import { useRef, useState } from "react";
import { useCubeConnection } from "./hooks/useCubeConnection";
import { useScramble } from "./hooks/useScramble";
import { useTimer } from "./hooks/useTimer";
import { useSolveTimes } from "./hooks/useSolveTimes";
import { useOLLTrainer } from "./hooks/useOLLTrainer";
import { useOLLTest } from "./hooks/useOLLTest";
import { usePLLTrainer } from "./hooks/usePLLTrainer";
import { useTestTimes } from "./hooks/useTestTimes";
import { useSolveMoveHistory } from "./hooks/useSolveMoveHistory";
import { useGyroCoreCorrection } from "./hooks/useGyroCoreCorrection";
import { useIsMobile } from "./hooks/useIsMobile";
import { RawQuaternion } from "./bluetooth/ganCube";
import { DesktopLayout } from "./ui/DesktopLayout";
import { MobileLayout } from "./ui/MobileLayout";

export function App() {
  const [mode, setMode] = useState<"solve" | "trainer" | "test">("solve");
  const [trainerType, setTrainerType] = useState<"oll" | "pll">("oll");
  const trainerGyroResetRef = useRef<RawQuaternion | null>(null);
  const cube = useCubeConnection();
  const solveTracking = useSolveMoveHistory(
    cube.facelets,
    cube.faceletSerial,
    cube.faceletTimestamp,
  );
  const trainerActive = mode === "trainer";
  const testActive = mode === "test";
  const helperTrackingDisabled = trainerActive || testActive;
  const helperMoveHistory = helperTrackingDisabled ? [] : solveTracking.moveHistory;
  const helperLastMove = helperTrackingDisabled ? null : solveTracking.lastMove;
  const helperSolved = helperTrackingDisabled ? false : cube.solved;

  const scramble = useScramble(helperMoveHistory);
  const { times, addTime, clearAll, exportCSV } = useSolveTimes();
  const testTimes = useTestTimes();
  const timer = useTimer(scramble.state, helperLastMove, helperSolved, addTime);
  const { correctionRef: gyroCorrectionRef, resetCorrection: resetGyroCoreCorrection } =
    useGyroCoreCorrection(cube.lastMove, solveTracking.lastMove);
  const ollTrainer = useOLLTrainer(cube.moveHistory, cube.gyroCurrentRef, trainerGyroResetRef);
  const trainer = usePLLTrainer(cube.moveHistory, cube.gyroCurrentRef, trainerGyroResetRef);
  const ollTest = useOLLTest(cube.moveHistory, cube.gyroCurrentRef, trainerGyroResetRef);
  const isMobile = useIsMobile();

  const layoutProps = {
    mode, setMode,
    trainerType, setTrainerType,
    cube, trainerGyroResetRef,
    ollTrainer, trainer, ollTest,
    scramble, timer,
    times, clearAll, exportCSV,
    testTimes,
    gyroCorrectionRef,
    resetGyroCoreCorrection,
  };

  return isMobile
    ? <MobileLayout {...layoutProps} />
    : <DesktopLayout {...layoutProps} />;
}
