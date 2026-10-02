import test from 'node:test';
import assert from 'node:assert/strict';
import { numericToCents } from './money';

test('numericToCents converts NUMERIC text exactly, including float-hostile values', () => {
  assert.equal(numericToCents('0.00'), 0);
  assert.equal(numericToCents('12'), 1200);
  assert.equal(numericToCents('12.5'), 1250);
  assert.equal(numericToCents('1.005'.replace(/5$/, '0')), 100);
  assert.equal(numericToCents('1.15'), 115);
  assert.equal(numericToCents('4.35'), 435);
  assert.equal(numericToCents('1234567.89'), 123456789);
});

test('numericToCents rejects sub-cent precision instead of silently rounding', () => {
  assert.throws(() => numericToCents('1.005'), /more than two decimal places/);
  assert.equal(numericToCents('1.500'), 150);
});

test('numericToCents rejects malformed and unsafe values', () => {
  assert.throws(() => numericToCents('abc'), /Invalid/);
  assert.throws(() => numericToCents('1e5'), /Invalid/);
  assert.throws(() => numericToCents(''), /Invalid/);
  assert.throws(() => numericToCents('999999999999999999.99'), /safe monetary range/);
});
