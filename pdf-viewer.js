import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.min.mjs";

const PDF_URL = "ern3st.works.pdf";
const PDFJS_VERSION = "4.6.82";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const loadingEl = document.getElementById("loading");
const fallbackEl = document.getElementById("fallback");
const fallbackMessageEl = document.getElementById("fallback-message");
const viewportEl = document.getElementById("viewport");
const canvas = document.getElementById("pdf-canvas");
const context = canvas.getContext("2d", { alpha: false });

let pdfDocument;
let page;
let baseViewport;
let renderTask;

function showFallback(message) {
  loadingEl.hidden = true;
  viewportEl.hidden = true;
  fallbackEl.hidden = false;
  if (fallbackMessageEl) {
    fallbackMessageEl.textContent = message;
  }
}

function getCssScale() {
  const availableWidth = Math.max(viewportEl.clientWidth, 1);
  const availableHeight = Math.max(viewportEl.clientHeight, 1);

  if (window.innerWidth < 768) {
    return availableWidth / baseViewport.width;
  }

  return Math.min(
    availableWidth / baseViewport.width,
    availableHeight / baseViewport.height,
  );
}

async function renderPage() {
  if (!page || !baseViewport || !context) {
    return;
  }

  if (renderTask) {
    renderTask.cancel();
    try {
      await renderTask.promise;
    } catch (error) {
      if (error?.name !== "RenderingCancelledException") {
        throw error;
      }
    }
  }

  const outputScale = Math.max(window.devicePixelRatio || 1, 1);
  const cssScale = getCssScale();

  const displayViewport = page.getViewport({ scale: cssScale });
  const renderViewport = page.getViewport({ scale: cssScale * outputScale });

  canvas.style.width = `${displayViewport.width}px`;
  canvas.style.height = `${displayViewport.height}px`;
  canvas.width = Math.ceil(renderViewport.width);
  canvas.height = Math.ceil(renderViewport.height);

  renderTask = page.render({
    canvasContext: context,
    viewport: renderViewport,
  });

  await renderTask.promise;
}

let resizeRaf;
function scheduleRender() {
  if (!page) {
    return;
  }

  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf);
  }

  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    renderPage().catch(() => {
      showFallback("Unable to render the document.");
    });
  });
}

async function init() {
  try {
    const loadingTask = pdfjsLib.getDocument(PDF_URL);
    pdfDocument = await loadingTask.promise;
    page = await pdfDocument.getPage(1);
    baseViewport = page.getViewport({ scale: 1 });

    await renderPage();

    loadingEl.hidden = true;
    viewportEl.hidden = false;
    fallbackEl.hidden = true;

    window.addEventListener("resize", scheduleRender, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleRender, { passive: true });
    }
  } catch (error) {
    showFallback("Unable to load the document.");
  }
}

if (!context) {
  showFallback("Canvas rendering is not supported in this browser.");
} else {
  init();
}
