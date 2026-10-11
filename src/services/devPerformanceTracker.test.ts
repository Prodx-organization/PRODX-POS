import assert from 'node:assert/strict';
import test from 'node:test';

test('performance tracker can be imported without browser globals', async () => {
  const originalWindow = globalThis.window;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

  try {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'requestAnimationFrame');

    const module = await import('./devPerformanceTracker.ts');
    assert.ok(module.devPerformanceTracker);
    assert.equal(module.devPerformanceTracker.getFpsData().currentFps, 60);
  } finally {
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
    if (originalRequestAnimationFrame !== undefined) {
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });
    }
  }
});
