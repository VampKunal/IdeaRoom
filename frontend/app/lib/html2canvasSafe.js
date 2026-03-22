/**
 * html2canvas 1.x only supports rgb/rgba/hsl + hex. Modern CSS (lab, oklch, color())
 * breaks its parser — including on the *cloned iframe* <html>/<body>, which
 * html2canvas ALWAYS parses before your target element (see index.js parseBackgroundColor).
 *
 * We normalize the entire cloned document inside onclone using the browser's
 * Canvas API to resolve any color to rgb/#.
 */

/** Parsed as TYPE color in html2canvas */
const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "column-rule-color",
  "caret-color",
  "fill",
  "stroke",
  "-webkit-text-stroke-color",
];

function isRgbLike(s) {
  return /^(rgb|rgba|#)/i.test(String(s).trim());
}

/**
 * Resolve any CSS color to rgb/# via Canvas (handles lab, oklch, var(), etc.).
 */
export function resolveColorForHtml2Canvas(value) {
  if (value == null || value === "") return value;
  const v = String(value).trim();
  if (v === "none" || v === "transparent") return v;
  if (isRgbLike(v)) return v;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return v;
    ctx.fillStyle = v;
    const out = ctx.fillStyle;
    if (typeof out === "string" && (out.startsWith("#") || out.startsWith("rgb"))) return out;
  } catch (_) {
    /* ignore */
  }
  return "#000000";
}

function hasModernColorFunc(str) {
  return /lab\(|oklch\(|oklab\(|color\(|lch\(|hwb\(/i.test(String(str));
}

/**
 * Walk every node in the cloned iframe and force colors + strip gradients/shadows
 * that html2canvas cannot parse.
 */
function sanitizeEntireCloneDocument(clonedDoc) {
  const win = clonedDoc.defaultView;
  if (!win) return;

  const roots = [
    clonedDoc.documentElement,
    clonedDoc.body,
    ...clonedDoc.querySelectorAll("*"),
  ].filter(Boolean);

  const seen = new Set();
  for (const el of roots) {
    if (seen.has(el)) continue;
    seen.add(el);

    let cs;
    try {
      cs = win.getComputedStyle(el);
    } catch (_) {
      continue;
    }

    for (const prop of COLOR_PROPS) {
      let val;
      try {
        val = cs.getPropertyValue(prop);
      } catch (_) {
        continue;
      }
      if (!val) continue;
      const t = val.trim();
      if (!t || t === "none" || t === "transparent") continue;
      if (isRgbLike(t)) continue;
      if ((prop === "fill" || prop === "stroke") && /^url\(/i.test(t)) continue;
      try {
        el.style.setProperty(prop, resolveColorForHtml2Canvas(t), "important");
      } catch (_) {
        /* ignore */
      }
    }

    let bgImg;
    try {
      bgImg = cs.getPropertyValue("background-image");
    } catch (_) {
      bgImg = "";
    }
    if (bgImg && bgImg !== "none" && /gradient/i.test(bgImg)) {
      try {
        el.style.setProperty("background-image", "none", "important");
      } catch (_) {
        /* ignore */
      }
      try {
        cs = win.getComputedStyle(el);
        const after = cs.getPropertyValue("background-color");
        if (after && after.trim() && after.trim() !== "transparent" && !isRgbLike(after.trim())) {
          el.style.setProperty(
            "background-color",
            resolveColorForHtml2Canvas(after),
            "important"
          );
        }
      } catch (_) {
        /* ignore */
      }
    }

    let bs;
    try {
      bs = cs.getPropertyValue("box-shadow");
    } catch (_) {
      bs = "";
    }
    if (bs && bs !== "none" && hasModernColorFunc(bs)) {
      try {
        el.style.setProperty("box-shadow", "none", "important");
      } catch (_) {
        /* ignore */
      }
    }

    let ts;
    try {
      ts = cs.getPropertyValue("text-shadow");
    } catch (_) {
      ts = "";
    }
    if (ts && ts !== "none" && hasModernColorFunc(ts)) {
      try {
        el.style.setProperty("text-shadow", "none", "important");
      } catch (_) {
        /* ignore */
      }
    }
  }
}

/**
 * Wrap html2canvas options with onclone that fixes lab/oklch and iframe root colors.
 */
export function buildHtml2CanvasOptions(base = {}) {
  const { onclone: userOnClone, ...rest } = base;
  return {
    ...rest,
    onclone: (clonedDoc, clonedEl) => {
      sanitizeEntireCloneDocument(clonedDoc);
      if (typeof userOnClone === "function") {
        userOnClone(clonedDoc, clonedEl);
      }
    },
  };
}
