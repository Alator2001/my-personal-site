// Однокнопочный переключатель языка EN <-> RU
document.addEventListener("DOMContentLoaded", () => {

  const BASE = "/my-personal-site/";

  // Находим сам селектор языка в шапке
  const langSelect = document.querySelector(".md-header .md-select");
  if (!langSelect) return;

  function toggleLangPath(pathname) {
    if (!pathname.startsWith(BASE)) return pathname; // на всякий случай
    const afterBase = pathname.slice(BASE.length); // часть пути внутри сайта

    // Если мы на RU → идём на EN (удаляем ведущий "ru/")
    if (afterBase.startsWith("ru/") || afterBase === "ru/" || afterBase === "ru") {
      const enPath = afterBase.replace(/^ru\/?/, "");
      return BASE + (enPath || ""); // может получиться BASE (домашняя EN)
    }

    // Мы на EN → идём на RU: вставляем "ru/" после BASE
    return BASE + "ru/" + afterBase;
  }

  // Клик по селектору
  langSelect.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { pathname, search, hash } = window.location;
    const target = toggleLangPath(pathname) + (search || "") + (hash || "");

    // Если страницы 1-в-1 нет в другой локали, плагин может отдавать 404.
    // Фолбэк: попробуем сходить, а если не повезёт — руками вернуть на корень той локали.
    fetch(target, { method: "HEAD" }).then(res => {
      if (res.ok) {
        window.location.href = target;
      } else {
        // Фолбэк: просто на корень альтернативной локали
        const goingToRu = !pathname.slice(BASE.length).startsWith("ru/");
        window.location.href = BASE + (goingToRu ? "ru/" : "");
      }
    }).catch(() => {
      const goingToRu = !pathname.slice(BASE.length).startsWith("ru/");
      window.location.href = BASE + (goingToRu ? "ru/" : "");
    });
  });
});
