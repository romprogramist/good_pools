// Парсит строковую цену с сайта в целое число рублей для фида и schema.org.
// "от 1 250 000 ₽" -> 1250000 ; "По проекту" -> null
function parsePrice(raw) {
  if (raw == null) return null;
  const str = String(raw);
  // Все группы цифр (с учётом разделителей-пробелов уже убранных), берём первую "крупную".
  const cleaned = str.replace(/[\s  ]/g, ''); // убрать обычные/неразрывные/узкие пробелы
  const matches = cleaned.match(/\d+/g);
  if (!matches) return null;
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (n >= 1000) return n; // отсекаем артефакты вроде "20" из "Скидка 20%"
  }
  return null;
}

module.exports = { parsePrice };
