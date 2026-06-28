import { useEffect } from "react";

export function useCounter(
  count: number,
  setCount: React.Dispatch<React.SetStateAction<number>>,
) {
  useEffect(() => {
    if (count <= 0) return;
    const intervalId = setInterval(() => {
      setCount((prevCount: number) => prevCount - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [count, setCount]);
}
