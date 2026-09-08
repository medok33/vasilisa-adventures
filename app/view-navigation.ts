// Device-local navigation only: never part of the child's saved learning data.
export function createViewNavigation<View extends string>(home: View) {
  const positions = new Map<View, number>();
  let current = home;
  return {
    remember(top: number) {
      positions.set(current, Number.isFinite(top) ? Math.max(0, top) : 0);
    },
    open(next: View) {
      current = next;
      return positions.get(next) ?? 0;
    },
    restore(next: View, top?: number) {
      current = next;
      if (typeof top === "number" && Number.isFinite(top)) positions.set(next, Math.max(0, top));
      return positions.get(next) ?? 0;
    },
    position(next: View) { return positions.get(next) ?? 0; },
  };
}
