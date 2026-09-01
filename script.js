/*
  SHINEHA JOURNAL / page controller
  通常は編集不要です。
  PC：section.scene 単位（見開き）
  スマホ：article.page 単位（1ページずつ）
*/

(() => {
  "use strict";

  const scenes = [...document.querySelectorAll(".scene")];
  const pages = [...document.querySelectorAll(".page")];
  const stage = document.getElementById("stage");
  const stageViewport = document.getElementById("stage-viewport");
  const prevButton = document.getElementById("prev");
  const nextButton = document.getElementById("next");
  const counter = document.getElementById("counter");
  const progressFill = document.getElementById("progress-fill");
  const drawer = document.getElementById("contents-drawer");
  const backdrop = document.getElementById("menu-backdrop");
  const openMenuButton = document.getElementById("open-menu");
  const closeMenuButton = document.getElementById("close-menu");
  const menuButtons = [...document.querySelectorAll("[data-go]")];
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const MIN_STAGE_WIDTH = 1160;
  const MAX_STAGE_WIDTH = 1600;
  const BASE_STAGE_HEIGHT = 720;

  let currentScene = 0;
  let currentPage = 0;
  let wasMobile = mobileQuery.matches;
  let touchStart = null;

  const sceneIndexForPage = page => scenes.indexOf(page.closest(".scene"));
  const firstPageIndexForScene = scene => pages.indexOf(scene.querySelector(".page"));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = number => String(number).padStart(2, "0");

  function isMobile() {
    return mobileQuery.matches;
  }

  /*
    PCでは誌面を1160×720の基準サイズで組み、画面の縦横に収まる最大倍率で
    全体を拡大します。文字や余白も同じ比率で大きくなるため、誌面の比率は
    どのウィンドウサイズでも変わりません。
  */
  function fitStageToWindow() {
    if (isMobile()) {
      stage.style.removeProperty("--stage-scale");
      stage.style.removeProperty("--stage-width");
      return;
    }

    /*
      実際に誌面へ割り当てられた中央領域を直接測ります。
      transform: scale() を使うため、Chrome / Safari / Firefoxで同じように拡大されます。
    */
    const availableWidth = Math.max(1, stageViewport.clientWidth - 20);
    const availableHeight = Math.max(1, stageViewport.clientHeight - 12);
    const heightScale = availableHeight / BASE_STAGE_HEIGHT;
    const responsiveStageWidth = clamp(availableWidth / heightScale, MIN_STAGE_WIDTH, MAX_STAGE_WIDTH);
    const scale = Math.min(availableWidth / responsiveStageWidth, heightScale);

    stage.style.setProperty("--stage-width", `${responsiveStageWidth}px`);
    stage.style.setProperty("--stage-scale", String(Math.max(0.35, scale)));
  }

  function updateHash() {
    const id = scenes[currentScene]?.id;
    if (!id) return;
    try {
      history.replaceState(null, "", `#${id}`);
    } catch (_) {
      /* file:// で履歴更新が許可されないブラウザでも閲覧は続けられます。 */
    }
  }

  function render() {
    const mobile = isMobile();

    scenes.forEach((scene, index) => {
      scene.classList.toggle("is-active", !mobile && index === currentScene);
      scene.setAttribute("aria-hidden", mobile ? "false" : String(index !== currentScene));
    });

    pages.forEach((page, index) => {
      page.classList.toggle("is-mobile-active", mobile && index === currentPage);
      if (mobile) page.setAttribute("aria-hidden", String(index !== currentPage));
      else page.removeAttribute("aria-hidden");
    });

    if (mobile) currentScene = sceneIndexForPage(pages[currentPage]);
    const index = mobile ? currentPage : currentScene;
    const total = mobile ? pages.length : scenes.length;
    counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    progressFill.style.width = `${((index + 1) / total) * 100}%`;
    prevButton.disabled = index === 0;
    nextButton.disabled = index === total - 1;

    menuButtons.forEach(button => {
      button.classList.toggle("current", button.dataset.go === scenes[currentScene]?.id);
    });

    const activePage = mobile ? pages[currentPage] : scenes[currentScene]?.querySelector(".page");
    if (activePage) activePage.scrollTop = 0;
    updateHash();
  }

  function goToScene(id) {
    const index = scenes.findIndex(scene => scene.id === id);
    if (index < 0) return;
    currentScene = index;
    currentPage = firstPageIndexForScene(scenes[index]);
    closeMenu();
    render();
  }

  function move(amount) {
    if (isMobile()) {
      currentPage = clamp(currentPage + amount, 0, pages.length - 1);
      currentScene = sceneIndexForPage(pages[currentPage]);
    } else {
      currentScene = clamp(currentScene + amount, 0, scenes.length - 1);
      currentPage = firstPageIndexForScene(scenes[currentScene]);
    }
    render();
  }

  function openMenu() {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    closeMenuButton.focus();
  }

  function closeMenu() {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  prevButton.addEventListener("click", () => move(-1));
  nextButton.addEventListener("click", () => move(1));
  openMenuButton.addEventListener("click", openMenu);
  closeMenuButton.addEventListener("click", closeMenu);
  backdrop.addEventListener("click", closeMenu);
  menuButtons.forEach(button => button.addEventListener("click", () => goToScene(button.dataset.go)));

  document.querySelector(".cover-page").addEventListener("click", event => {
    if (!event.target.closest("a, button, summary, details")) move(1);
  });

  stage.addEventListener("touchstart", event => {
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  stage.addEventListener("touchend", event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener("keydown", event => {
    if (event.target.closest("a, button, summary, input, textarea, select")) return;
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "Home") goToScene(scenes[0].id);
    if (event.key === "End") goToScene(scenes[scenes.length - 1].id);
    if (event.key === "Escape") closeMenu();
  });

  const handleLayoutChange = () => {
    if (isMobile() && !wasMobile) currentPage = firstPageIndexForScene(scenes[currentScene]);
    if (!isMobile() && wasMobile) currentScene = sceneIndexForPage(pages[currentPage]);
    wasMobile = isMobile();
    fitStageToWindow();
    render();
  };

  if (typeof mobileQuery.addEventListener === "function") mobileQuery.addEventListener("change", handleLayoutChange);
  else mobileQuery.addListener(handleLayoutChange);

  window.addEventListener("resize", fitStageToWindow, { passive: true });
  window.visualViewport?.addEventListener("resize", fitStageToWindow, { passive: true });
  if (typeof ResizeObserver === "function") new ResizeObserver(fitStageToWindow).observe(stageViewport);

  const initialId = decodeURIComponent(location.hash.replace(/^#/, ""));
  const initialScene = scenes.findIndex(scene => scene.id === initialId);
  if (initialScene >= 0) {
    currentScene = initialScene;
    currentPage = firstPageIndexForScene(scenes[initialScene]);
  }
  fitStageToWindow();
  requestAnimationFrame(fitStageToWindow);
  render();
})();
