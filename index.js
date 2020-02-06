module.exports=function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=7)}([function(e,t){e.exports=require("xstream")},function(e,t){e.exports=require("xstream/extra/sampleCombine")},function(e,t){e.exports=require("xstream/extra/fromEvent")},function(e,t){e.exports=require("mathjs")},function(e,t){e.exports=require("xstream/extra/dropRepeats")},function(e,t){e.exports=require("unist-util-visit")},function(e,t){e.exports=require("@mvarble/frames.js")},function(e,t,n){"use strict";n.r(t);var r=n(0),o=n.n(r),u=n(1),i=n.n(u),c=n(2),a=n.n(c),f=n(3),s=n(4),l=n.n(s),d=n(5),p=n.n(d),m=n(6);function v(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function b(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?v(Object(n),!0).forEach((function(t){y(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):v(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function y(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function h(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if(!(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)))return;var n=[],r=!0,o=!1,u=void 0;try{for(var i,c=e[Symbol.iterator]();!(r=(i=c.next()).done)&&(n.push(i.value),!t||n.length!==t);r=!0);}catch(e){o=!0,u=e}finally{try{r||null==c.return||c.return()}finally{if(o)throw u}}return n}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function O(e,t){return t.compose(i()(e)).filter((function(e){var t=h(e,2),n=(t[0],t[1].canvas);return!n||!document.body.contains(n)})).map((function(e){var t=h(e,1)[0];return function(e){return b({},e,{canvas:t})}}))}function g(e){return function(t){return t.compose(i()(e)).map((function(e){var t=h(e,2),n=t[0],r=t[1];return function(e){return b({},n(e),{canvas:r})}}))}}function w(e){return e.map((function(e){return e&&e.parentNode?o.a.merge(o.a.of(void 0),a()(window,"resize")).map((function(){return[e.parentNode.offsetWidth,e.parentNode.offsetHeight]})).compose(l()((function(e,t){return e[0]==t[0]&&e[1]==t[1]}))):o.a.empty()}))}function j(e){var t=e.dragStart||e.target,n=t.getBoundingClientRect();return[(e.clientX-n.left)/(n.right-n.left)*t.width,(e.clientY-n.top)/(n.bottom-n.top)*t.height]}function x(e,t){if(!function(e){return e.data&&e.worldMatrix&&(e.data.clickBox||e.data.clickBoxes)}(t))return!1;var n=Object(m.locFrameTrans)(j(e),{worldMatrix:f.identity(3)},t),r=t.data;return!(!r.clickBoxes||!r.clickBoxes.some((function(e){return k(n,e)})))||!!r.clickBox&&k(n,r.clickBox)}function k(e,t){var n=h(e,2),r=n[0],o=n[1],u=h(t,4),i=u[0],c=u[1],a=u[2],f=u[3];return r>=i&&r<=a&&o>=c&&o<=f}function P(e,t){var n=null;return p()(t,(function(t,r,o){if(x(e,t))return n=t,!1})),n=n&&n.children&&n.children.length&&P(e,b({},n,{data:{}}))||n}function M(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if(!(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)))return;var n=[],r=!0,o=!1,u=void 0;try{for(var i,c=e[Symbol.iterator]();!(r=(i=c.next()).done)&&(n.push(i.value),!t||n.length!==t);r=!0);}catch(e){o=!0,u=e}finally{try{r||null==c.return||c.return()}finally{if(o)throw u}}return n}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function S(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function D(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?S(Object(n),!0).forEach((function(t){q(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):S(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function q(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function B(e){var t={};return t.click=e.events("click"),t.mousemove=e.events("mousemove"),t.mouseleave=e.events("mouseleave"),t.wheel=e.events("wheel"),t.mousedown=e.events("mousedown"),t.mouseup=e.events("mouseup"),t.lMousedown=t.mousedown.filter((function(e){return 1===e.which})),t.lMouseup=t.mouseup.filter((function(e){return 1===e.which})),t.rMousedown=t.mousedown.filter((function(e){return 3===e.which})),t.rMouseup=t.mouseup.filter((function(e){return 3===e.which})),t.mMousedown=t.mousedown.filter((function(e){return 2===e.which})),t.mMouseup=t.mouseup.filter((function(e){return 2===e.which})),t.singleclick=t.mousedown.map((function(e){return t.click.endWhen(o.a.periodic(250).take(1)).filter((function(t){return f.chain([e.clientX-t.clientX,e.clientY-t.clientY]).abs().max().done()<3}))})).flatten(),t.doubleclick=t.mousedown.mapTo(t.click.endWhen(o.a.periodic(350).take(1)).drop(1)).flatten(),t.drag=t.mousedown.compose(E),t}function E(e){var t=function(e,t){return t.dragStart=e.target,t};return e.map((function(e){var n=a()(document,"mousemove").map((function(n){return t(e,n)})),r=a()(document,"mouseup").map((function(n){return t(e,n)}));return o.a.create({start:function(e){var t=!1;o.a.merge(n.endWhen(r),r.take(1)).addListener({next:function(n){("mousemove"===n.type||t)&&(t=!0,e.next(n))},error:function(t){return e.error(t)},complete:function(){return e.complete()}})},stop:function(){}})}))}function A(e){var t=e.mouse,n=e.node,r=D({},t),o=function(e,t){return function(e){return e.compose(i()(n)).map((function(e){var t=M(e,2),n=t[0],r=t[1];if(!r||!r.children||!r.children.length)return{key:void 0,out:n};var o=r.children.find((function(e){return x(n,e)}));return{key:o?o.key:void 0,out:n}}))}(e).filter((function(e){return e.key===t})).map((function(e){return e.out}))};return r.select=function(e){return Object.keys(r).reduce((function(t,n){return"drag"===n?D({},t,{drag:o(r.mousedown,e).compose(E)}):"select"===n?t:D({},t,q({},n,o(r[n],e)))}),{})},r}function T(e){var t=e.mouse,n=e.end,r={};return t.select&&(r.select=function(e){return t.select(e).endWhen(n)}),r=D({},r,{},Object.keys(t).filter((function(e){return"select"!==e})).reduce((function(e,r){return D({},e,q({},r,t[r].endWhen(n)))}),{}))}function W(e){return function(t){t.addListener({next:function(t){t.canvas&&t.canvas.getContext&&(t.width&&t.height&&(t.canvas.width=t.width,t.canvas.height=t.height),e(t.canvas,t))}})}}n.d(t,"MouseObject",(function(){return B})),n.d(t,"FilteredMouse",(function(){return A})),n.d(t,"KilledMouse",(function(){return T})),n.d(t,"makeViewportDriver",(function(){return W})),n.d(t,"refreshReducer",(function(){return O})),n.d(t,"mountCanvas",(function(){return g})),n.d(t,"parentSize",(function(){return w})),n.d(t,"relativeMousePosition",(function(){return j})),n.d(t,"isOver",(function(){return x})),n.d(t,"getOver",(function(){return P}));t.default={MouseObject:B,FilteredMouse:A,KilledMouse:T,makeViewportDriver:W,refreshReducer:O,mountCanvas:g,parentSize:w,relativeMousePosition:j,isOver:x,getOver:P}}]);