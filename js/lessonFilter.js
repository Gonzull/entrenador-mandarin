// Selector de lección que acompaña a los filtros por nivel HSK.
// Solo se muestra cuando hay un nivel elegido y sus elementos tienen lección
// (la del libro HSK Standard Course de ese nivel).
function createLessonFilter(select, onChange) {
  let lesson = 'all';
  select.addEventListener('change', () => {
    lesson = select.value;
    onChange();
  });
  return {
    // items: los elementos del nivel elegido; level: 'all', 'due' o un número
    update(items, level) {
      lesson = 'all';
      const lessons = [...new Set(items.map(x => x.lesson).filter(Boolean))].sort((a, b) => a - b);
      // repaso extra: palabras del nivel sin lección en el libro, al final de la lista
      const extra = items.filter(x => x.extra).length;
      const show = !Number.isNaN(Number(level)) && (lessons.length > 0 || extra > 0);
      select.style.display = show ? '' : 'none';
      if (!show) return;
      select.innerHTML =
        '<option value="all">Todas las lecciones</option>' +
        lessons.map(n => `<option value="${n}">Lección ${n} (${items.filter(x => x.lesson === n).length})</option>`).join('') +
        (extra ? `<option value="extra">Repaso extra (${extra})</option>` : '');
    },
    apply(items) {
      if (lesson === 'all') return items;
      if (lesson === 'extra') return items.filter(x => x.extra);
      return items.filter(x => x.lesson === Number(lesson));
    }
  };
}

export { createLessonFilter };
