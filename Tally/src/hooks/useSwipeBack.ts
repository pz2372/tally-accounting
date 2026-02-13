import { useRef } from 'react';
import { PanResponder } from 'react-native';

export function useSwipeBack(onBack: () => void) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          onBack();
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
