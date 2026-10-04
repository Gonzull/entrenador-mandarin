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
      const show = !Number.isNaN(Number(level)) && lessons.length > 0;
      select.style.display = show ? '' : 'none';
      if (!show) return;
      select.innerHTML =
        '<option value="all">Todas las lecciones</option>' +
        lessons.map(n => `<option value="${n}">Lección ${n} (${items.filter(x => x.lesson === n).length})</option>`).join('');
    },
    apply(items) {
      return lesson === 'all' ? items : items.filter(x => x.lesson === Number(lesson));
    }
  };
}

export { createLessonFilter };
