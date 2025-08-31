export function randomDelay(): number {
  // 2 to 10 seconds (in ms)
  return 2000 + Math.floor(Math.random() * 8000);
}