export function loopBack(min: number, max: number, step: number) {
  let current = 0;
  let direction = 1;
  return () => {
    if (current > max) {
      current = max;
      direction = -1;
    }
    if (current < min) {
      current = min;
      direction = 1;
    }
    current += step * direction;
    return current;
  };
}