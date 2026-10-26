// Escapes user input before it is placed inside a RegExp, so a search like ".*" or "(a+)+"
// is treated as plain text instead of a pattern (prevents regex injection / ReDoS).
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
