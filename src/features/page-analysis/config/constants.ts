export const MAX_NODES = 8000;
export const MAX_TEXT_LEN = 600;

export const TARGET_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "a", "li",
  "div", "section", "header", "footer", "main", "aside", "article",
  "img", "button", "input", "textarea", "select"
]);

export const SKIP_TAGS = new Set([
  "script", "style", "noscript", "link", "meta", "template",
  "svg", "canvas", "iframe", "object"
]);