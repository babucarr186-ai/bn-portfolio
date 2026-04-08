/**
 * Returns a debounced version of `fn` that delays invocation until `delay` ms
 * have elapsed since the last call.
 *
 * @param {Function} fn
 * @param {number} delay - milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), delay);
  };
}
