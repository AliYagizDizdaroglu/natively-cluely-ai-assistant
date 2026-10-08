var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/services/containment.ts
var containment_exports = {};
__export(containment_exports, {
  normalizeForContainment: () => normalizeForContainment
});
module.exports = __toCommonJS(containment_exports);
function normalizeForContainment(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").replace(/\b([a-z]{1,3}) (\d+)\b/g, "$1$2").trim();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  normalizeForContainment
});
