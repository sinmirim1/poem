let counter = 0;

/** 겹치지 않는 짧은 이름표 */
export function uid(prefix = 's'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
