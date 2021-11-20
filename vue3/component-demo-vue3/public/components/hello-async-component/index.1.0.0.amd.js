/*
 * @Author: liubei
 * @Date: 2021-11-19 14:28:52
 * @LastEditTime: 2021-11-19 14:46:53
 * @Description: 
 */
var __vite_style__ = document.createElement("style");
__vite_style__.innerHTML = "\n.hello-async-component[data-v-75d3e9c0] {\r\n  font-size: 20px;\n}\r\n";
document.head.appendChild(__vite_style__);
define(["require", "exports", "vue"], function(require, exports, vue) {
  "use strict";
  var HelloAsyncComponent_vue_vue_type_style_index_0_scoped_true_lang = "";
  var _export_sfc = (sfc, props) => {
    for (const [key, val] of props) {
      sfc[key] = val;
    }
    return sfc;
  };
  const _sfc_main = {
    name: "HelloAsyncComponent",
    setup() {
      const markedStr = vue.ref("");
      new Promise(function(resolve, reject) {
        require(["./marked.esm"], resolve, reject);
      }).then((m) => {
        markedStr.value = m.marked("- hello, async component vue3");
      });
      return {
        markedStr
      };
    }
  };
  const _hoisted_1 = ["innerHTML"];
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("div", {
      class: "hello-async-component",
      innerHTML: $setup.markedStr
    }, null, 8, _hoisted_1);
  }
  var HelloAsyncComponent = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-75d3e9c0"]]);
  exports.HelloAsyncComponent = HelloAsyncComponent;
  exports["default"] = HelloAsyncComponent;
  Object.defineProperty(exports, "__esModule", { value: true });
  exports[Symbol.toStringTag] = "Module";
});
