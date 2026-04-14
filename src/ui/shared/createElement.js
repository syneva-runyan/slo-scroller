export function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}