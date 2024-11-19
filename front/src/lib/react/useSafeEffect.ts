import { DependencyList, EffectCallback, useEffect } from "react";

/**
 * @brief Prevents double call issue in development
 */
export const useSafeEffect = (callback: EffectCallback, deps: DependencyList) => {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      callback();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, deps);
};
