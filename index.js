module.exports=function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=6)}([function(e,t){e.exports=require("xstream")},function(e,t){e.exports=require("xstream/extra/fromEvent")},function(e,t){e.exports=require("@mvarble/frames.js")},function(e,t){e.exports=require("@cycle/dom")},function(e,t){e.exports=require("xstream/extra/sampleCombine")},function(e,t){e.exports=require("unist-util-visit")},function(e,t,r){"use strict";r.r(t),r.d(t,"Viewport",(function(){return M})),r.d(t,"ViewportParser",(function(){return E})),r.d(t,"FrameSourceMaster",(function(){return g})),r.d(t,"FrameSource",(function(){return O})),r.d(t,"relativeMousePosition",(function(){return k})),r.d(t,"isOver",(function(){return w})),r.d(t,"getOver",(function(){return S})),r.d(t,"createDrag",(function(){return P}));var n=r(0),o=r.n(n),i=r(3),u=r(4),a=r.n(u),c=r(1),f=r.n(c),s=r(5),l=r.n(s),p=r(2);function d(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function m(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function h(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if(!(Symbol.iterator in Object(e))&&"[object Arguments]"!==Object.prototype.toString.call(e))return;var r=[],n=!0,o=!1,i=void 0;try{for(var u,a=e[Symbol.iterator]();!(n=(u=a.next()).done)&&(r.push(u.value),!t||r.length!==t);n=!0);}catch(e){o=!0,i=e}finally{try{n||null==a.return||a.return()}finally{if(o)throw i}}return r}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function v(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function y(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function b(e,t,r){return t&&y(e.prototype,t),r&&y(e,r),e}var g=function(){function e(t,r,n){v(this,e),this._domSource=t,this._frame$=r,this._isDeep$=n,this._parsedStreams={}}return b(e,[{key:"select",value:function(e){if(e&&"function"!=typeof e)throw new TypeError("`FrameSource.select` needs a function obj => bool");return new O(this,e)}},{key:"events",value:function(e){return this._parsedStreams[e]||(this._parsedStreams[e]=this._domSource.events(e).compose(a()(this._frame$,this._isDeep$)).map((function(e){var t=h(e,3),r=t[0],n=S(r,t[1],t[2]);return r.frame=n,r}))),this._parsedStreams[e]}}]),e}(),O=function(){function e(t,r){v(this,e),this._master=t,this._selector=r}return b(e,[{key:"select",value:function(t){var r=this;if(t&&"function"!=typeof t)throw new TypeError("`FrameSource.select` needs a function obj => bool");return new e(this._master,(function(e){return r._selector(e)&&t(e)}))}},{key:"events",value:function(e){var t=this;return this._master.events(e).filter((function(e){return e.frame&&t._selector(e.frame)}))}}]),e}();function k(e){var t=e.isDrag?e.isDrag.target:e.target,r=t.getBoundingClientRect();return[(e.clientX-r.left)/(r.right-r.left)*t.width,(e.clientY-r.top)/(r.bottom-r.top)*t.height]}function w(e,t){if(!function(e){return e.data&&e.worldMatrix&&(e.data.clickBox||e.data.clickBoxes||e.data.clickDisk||e.data.clickDisks)}(t))return!1;var r=Object(p.locFrameTrans)(k(e),p.identityFrame,t),n=t.data;return!(!n.clickBoxes||!n.clickBoxes.some((function(e){return j(r,e)})))||(!(!n.clickDisks||!n.clickDisks.some((function(e){return x(r,e)})))||(!(!n.clickDisk||!x(r,n.clickDisk))||!!n.clickBox&&j(r,n.clickBox)))}function j(e,t){var r=h(e,2),n=r[0],o=r[1],i=h(t,4),u=i[0],a=i[1],c=i[2],f=i[3];return n>=u&&n<=c&&o>=a&&o<=f}function x(e,t){var r=h(e,2),n=r[0],o=r[1],i=h(t,3),u=i[0],a=i[1],c=i[2];return Math.pow(n-u,2)+Math.pow(o-a,2)<=Math.pow(c,2)}function S(e,t,r){var n=null;return l()(t,(function(t){if(w(e,t))return n=t,!1})),r&&n&&n.children&&n.children.length&&S(e,function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?d(Object(r),!0).forEach((function(t){m(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):d(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}({},n,{data:{}}),r)||n}var _=function(e,t){return t.isDrag=e,t};function P(e){try{document}catch(e){if("ReferenceError"!==e.name)throw e;return o.a.empty()}return e.map((function(e){var t=f()(document,"mousemove").map((function(t){return _(e,t)})),r=f()(document,"mouseup").map((function(t){return _(e,t)}));return o.a.create({start:function(e){var n=!1;o.a.merge(t.endWhen(r),r.take(1)).addListener({next:function(t){("mousemove"===t.type||n)&&(n=!0,e.next(t))},error:function(t){return e.error(t)},complete:function(){return e.complete()}})},stop:function(){}})}))}function D(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if(!(Symbol.iterator in Object(e))&&"[object Arguments]"!==Object.prototype.toString.call(e))return;var r=[],n=!0,o=!1,i=void 0;try{for(var u,a=e[Symbol.iterator]();!(n=(u=a.next()).done)&&(r.push(u.value),!t||r.length!==t);n=!0);}catch(e){o=!0,i=e}finally{try{n||null==a.return||a.return()}finally{if(o)throw i}}return r}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function M(e){var t=e.render,r=e.renderState,n=e.vdom;return o.a.combine(t,r,n).filter((function(e){return"function"==typeof D(e,1)[0]})).map((function(e){var t=D(e,3),r=t[0],n=t[1],o=t[2],u=function(e){(function(e){var t=!1;try{t=e&&e.elm&&document.body.contains(e.elm)&&"function"==typeof e.elm.getContext}catch(e){if("ReferenceError"!==e.name)throw e}return t})(e)&&r(e.elm,n)};if(o.data||(o.data={}),o.data.hook||(o.data.hook={}),o.data.hook.insert){var a=o.data.hook.insert;o.data.hook.insert=function(e){a(e),u(e)}}else dvom.data.hook.insert=u;if(o.data.hook.postpatch){var c=o.data.hook.postpatch;o.data.hook.postpatch=function(e,t){c(e,t),u(t)}}else o.data.hook.postpatch=function(e,t){return u(t)};return Object(i.h)(o.sel,o.data,o.children||[])}))}function E(e){var t=e.domSource,r=e.frame,n=e.isDeep;return new g(t,r,n)}t.default={Viewport:M,ViewportParser:E,FrameSourceMaster:g,FrameSource:O,relativeMousePosition:k,isOver:w,getOver:S,createDrag:P}}]);