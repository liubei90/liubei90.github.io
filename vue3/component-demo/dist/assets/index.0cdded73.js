import{V as v}from"./vendor.b0a03f26.js";const y=function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function l(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerpolicy&&(n.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?n.credentials="include":e.crossorigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(e){if(e.ep)return;e.ep=!0;const n=l(e);fetch(e.href,n)}};y();const g="modulepreload",_={},$="./",C=function(o,l){return!l||l.length===0?o():Promise.all(l.map(s=>{if(s=`${$}${s}`,s in _)return;_[s]=!0;const e=s.endsWith(".css"),n=e?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${s}"]${n}`))return;const i=document.createElement("link");if(i.rel=e?"stylesheet":g,e||(i.as="script",i.crossOrigin=""),i.href=s,document.head.appendChild(i),e)return new Promise((u,r)=>{i.addEventListener("load",u),i.addEventListener("error",r)})})).then(()=>o())};var E=function(){var t=this,o=t.$createElement,l=t._self._c||o;return l("div",[l("button",{on:{click:function(s){return t.handleImport()}}},[t._v("click")]),l(t.comp,{tag:"component"})],1)},L=[];function O(t,o,l,s,e,n,i,u){var r=typeof t=="function"?t.options:t;o&&(r.render=o,r.staticRenderFns=l,r._compiled=!0),s&&(r.functional=!0),n&&(r._scopeId="data-v-"+n);var a;if(i?(a=function(c){c=c||this.$vnode&&this.$vnode.ssrContext||this.parent&&this.parent.$vnode&&this.parent.$vnode.ssrContext,!c&&typeof __VUE_SSR_CONTEXT__!="undefined"&&(c=__VUE_SSR_CONTEXT__),e&&e.call(this,c),c&&c._registeredComponents&&c._registeredComponents.add(i)},r._ssrRegister=a):e&&(a=u?function(){e.call(this,(r.functional?this.parent:this).$root.$options.shadowRoot)}:e),a)if(r.functional){r._injectStyles=a;var h=r.render;r.render=function(m,d){return a.call(d),h(m,d)}}else{var f=r.beforeCreate;r.beforeCreate=f?[].concat(f,a):[a]}return{exports:t,options:r}}const R={data(){return{path:"/components/hello-async-component/index.1.0.0.es.js",comp:"div"}},created(){},methods:{handleImport(){C(()=>import(this.path),[]).then(t=>{console.log(t),this.comp=t.default})}}},p={};var b=O(R,E,L,!1,k,null,null,null);function k(t){for(let o in p)this[o]=p[o]}var P=function(){return b.exports}();new v({el:"#app",render:t=>t(P)});
