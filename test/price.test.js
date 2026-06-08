const test = require('node:test');
const assert = require('node:assert');
const { parsePrice } = require('../lib/price');

test('извлекает число из строки "от 1 250 000 ₽"', () => {
  assert.strictEqual(parsePrice('от 1 250 000 ₽'), 1250000);
});

test('понимает неразрывные пробелы и табуляции', () => {
  assert.strictEqual(parsePrice('от 1 250 000 ₽'), 1250000);
});

test('берёт только первое число (диапазоны)', () => {
  assert.strictEqual(parsePrice('1 100 000 – 1 300 000 ₽'), 1100000);
});

test('возвращает null для "По проекту"', () => {
  assert.strictEqual(parsePrice('По проекту'), null);
});

test('возвращает null для пустых/невалидных значений', () => {
  assert.strictEqual(parsePrice(''), null);
  assert.strictEqual(parsePrice(null), null);
  assert.strictEqual(parsePrice(undefined), null);
});

test('игнорирует слишком маленькие числа-артефакты (< 1000)', () => {
  assert.strictEqual(parsePrice('Скидка 20% — от 890 000 ₽'), 890000);
});
