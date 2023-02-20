(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[453],{4353:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>ei});class s extends Error{constructor({page:e}){super(`The middleware "${e}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `)}}class n extends Error{constructor(){super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `)}}class i extends Error{constructor(){super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `)}}function o(e){let t=new Headers;for(let[r,s]of Object.entries(e)){let n=Array.isArray(s)?s:[s];for(let i of n)void 0!==i&&t.append(r,i)}return t}function a(e){var t,r,s,n,i,o=[],a=0;function l(){for(;a<e.length&&/\s/.test(e.charAt(a));)a+=1;return a<e.length}for(;a<e.length;){for(t=a,i=!1;l();)if(","===(r=e.charAt(a))){for(s=a,a+=1,l(),n=a;a<e.length&&"="!==(r=e.charAt(a))&&";"!==r&&","!==r;)a+=1;a<e.length&&"="===e.charAt(a)?(i=!0,a=n,o.push(e.substring(t,s)),t=a):a=s+1}else a+=1;(!i||a>=e.length)&&o.push(e.substring(t,e.length))}return o}function l(e){let t={};if(e)for(let[r,s]of e.entries())t[r]=s,"set-cookie"===r.toLowerCase()&&(t[r]=a(s));return t}function h(e){try{return String(new URL(String(e)))}catch(t){throw Error(`URL is malformed "${String(e)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`,{cause:t})}}let u=Symbol("response"),d=Symbol("passThrough"),c=Symbol("waitUntil");class p{[c]=[];[d]=!1;constructor(e){}respondWith(e){this[u]||(this[u]=Promise.resolve(e))}passThroughOnException(){this[d]=!0}waitUntil(e){this[c].push(e)}}class f extends p{constructor(e){super(e.request),this.sourcePage=e.page}get request(){throw new s({page:this.sourcePage})}respondWith(){throw new s({page:this.sourcePage})}}function g(e,t,r){let s;if(e)for(let n of(r&&(r=r.toLowerCase()),e)){var i,o;let a=null==(i=n.domain)?void 0:i.split(":")[0].toLowerCase();if(t===a||r===n.defaultLocale.toLowerCase()||(null==(o=n.locales)?void 0:o.some(e=>e.toLowerCase()===r))){s=n;break}}return s}function m(e){return e.replace(/\/$/,"")||"/"}function w(e){let t=e.indexOf("#"),r=e.indexOf("?"),s=r>-1&&(t<0||r<t);return s||t>-1?{pathname:e.substring(0,s?r:t),query:s?e.substring(r,t>-1?t:void 0):"",hash:t>-1?e.slice(t):""}:{pathname:e,query:"",hash:""}}function x(e,t){if(!e.startsWith("/")||!t)return e;let{pathname:r,query:s,hash:n}=w(e);return`${t}${r}${s}${n}`}function b(e,t){if(!e.startsWith("/")||!t)return e;let{pathname:r,query:s,hash:n}=w(e);return`${r}${t}${s}${n}`}function y(e,t){if("string"!=typeof e)return!1;let{pathname:r}=w(e);return r===t||r.startsWith(t+"/")}function v(e,t,r,s){return t&&t!==r&&(s||!y(e.toLowerCase(),`/${t.toLowerCase()}`)&&!y(e.toLowerCase(),"/api"))?x(e,`/${t}`):e}function S(e){let t=v(e.pathname,e.locale,e.buildId?void 0:e.defaultLocale,e.ignorePrefix);return(e.buildId||!e.trailingSlash)&&(t=m(t)),e.buildId&&(t=b(x(t,`/_next/data/${e.buildId}`),"/"===e.pathname?"index.json":".json")),t=x(t,e.basePath),!e.buildId&&e.trailingSlash?t.endsWith("/")?t:b(t,"/"):m(t)}function _(e,t){var r;return null==(r=!Array.isArray(null==t?void 0:t.host)&&(null==t?void 0:t.host)||e.hostname)?void 0:r.split(":")[0].toLowerCase()}function L(e,t){let r;let s=e.split("/");return(t||[]).some(t=>!!s[1]&&s[1].toLowerCase()===t.toLowerCase()&&(r=t,s.splice(1,1),e=s.join("/")||"/",!0)),{pathname:e,detectedLocale:r}}function C(e,t){if(y(e,t)){let r=e.slice(t.length);return r.startsWith("/")?r:`/${r}`}return e}function $(e,t){var r;let{basePath:s,i18n:n,trailingSlash:i}=null!=(r=t.nextConfig)?r:{},o={pathname:e,trailingSlash:"/"!==e?e.endsWith("/"):i};if(s&&y(o.pathname,s)&&(o.pathname=C(o.pathname,s),o.basePath=s),!0===t.parseData&&o.pathname.startsWith("/_next/data/")&&o.pathname.endsWith(".json")){let a=o.pathname.replace(/^\/_next\/data\//,"").replace(/\.json$/,"").split("/"),l=a[0];o.pathname="index"!==a[1]?`/${a.slice(1).join("/")}`:"/",o.buildId=l}if(n){let h=L(o.pathname,n.locales);o.locale=null==h?void 0:h.detectedLocale,o.pathname=(null==h?void 0:h.pathname)||o.pathname}return o}let P=/(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|::1|localhost)/;function q(e,t){return new URL(String(e).replace(P,"localhost"),t&&String(t).replace(P,"localhost"))}let I=Symbol("NextURLInternal");class R{constructor(e,t,r){let s,n;"object"==typeof t&&"pathname"in t||"string"==typeof t?(s=t,n=r||{}):n=r||t||{},this[I]={url:q(e,s??n.base),options:n,basePath:""},this.analyzeUrl()}analyzeUrl(){var e,t,r,s,n;let i=$(this[I].url.pathname,{nextConfig:this[I].options.nextConfig,parseData:!0});this[I].domainLocale=g(null==(e=this[I].options.nextConfig)?void 0:null==(t=e.i18n)?void 0:t.domains,_(this[I].url,this[I].options.headers));let o=(null==(r=this[I].domainLocale)?void 0:r.defaultLocale)||(null==(s=this[I].options.nextConfig)?void 0:null==(n=s.i18n)?void 0:n.defaultLocale);this[I].url.pathname=i.pathname,this[I].defaultLocale=o,this[I].basePath=i.basePath??"",this[I].buildId=i.buildId,this[I].locale=i.locale??o,this[I].trailingSlash=i.trailingSlash}formatPathname(){return S({basePath:this[I].basePath,buildId:this[I].buildId,defaultLocale:this[I].options.forceLocale?void 0:this[I].defaultLocale,locale:this[I].locale,pathname:this[I].url.pathname,trailingSlash:this[I].trailingSlash})}formatSearch(){return this[I].url.search}get buildId(){return this[I].buildId}set buildId(e){this[I].buildId=e}get locale(){return this[I].locale??""}set locale(e){var t,r;if(!this[I].locale||!(null==(t=this[I].options.nextConfig)?void 0:null==(r=t.i18n)?void 0:r.locales.includes(e)))throw TypeError(`The NextURL configuration includes no locale "${e}"`);this[I].locale=e}get defaultLocale(){return this[I].defaultLocale}get domainLocale(){return this[I].domainLocale}get searchParams(){return this[I].url.searchParams}get host(){return this[I].url.host}set host(e){this[I].url.host=e}get hostname(){return this[I].url.hostname}set hostname(e){this[I].url.hostname=e}get port(){return this[I].url.port}set port(e){this[I].url.port=e}get protocol(){return this[I].url.protocol}set protocol(e){this[I].url.protocol=e}get href(){let e=this.formatPathname(),t=this.formatSearch();return`${this.protocol}//${this.host}${e}${t}${this.hash}`}set href(e){this[I].url=q(e),this.analyzeUrl()}get origin(){return this[I].url.origin}get pathname(){return this[I].url.pathname}set pathname(e){this[I].url.pathname=e}get hash(){return this[I].url.hash}set hash(e){this[I].url.hash=e}get search(){return this[I].url.search}set search(e){this[I].url.search=e}get password(){return this[I].url.password}set password(e){this[I].url.password=e}get username(){return this[I].url.username}set username(e){this[I].url.username=e}get basePath(){return this[I].basePath}set basePath(e){this[I].basePath=e.startsWith("/")?e:`/${e}`}toString(){return this.href}toJSON(){return this.href}[Symbol.for("edge-runtime.inspect.custom")](){return{href:this.href,origin:this.origin,protocol:this.protocol,username:this.username,password:this.password,host:this.host,hostname:this.hostname,port:this.port,pathname:this.pathname,search:this.search,searchParams:this.searchParams,hash:this.hash}}clone(){return new R(String(this),this[I].options)}}let j=["strict","lax","none"];function k(e){return e=e.toLowerCase(),j.includes(e)?e:void 0}function E(e){let t={};for(let r in e)e[r]&&(t[r]=e[r]);return t}function U(e){let t=["path"in e&&e.path&&`Path=${e.path}`,"expires"in e&&e.expires&&`Expires=${e.expires.toUTCString()}`,"maxAge"in e&&e.maxAge&&`Max-Age=${e.maxAge}`,"domain"in e&&e.domain&&`Domain=${e.domain}`,"secure"in e&&e.secure&&"Secure","httpOnly"in e&&e.httpOnly&&"HttpOnly","sameSite"in e&&e.sameSite&&`SameSite=${e.sameSite}`].filter(Boolean);return`${e.name}=${encodeURIComponent(e.value??"")}; ${t.join("; ")}`}function A(e){let t=new Map;for(let r of e.split(/; */)){if(!r)continue;let s=r.indexOf("="),n=r.slice(0,s),i=r.slice(s+1);t.set(n,decodeURIComponent(i??"true"))}return t}function O(e){if(!e)return;let[[t,r],...s]=A(e),{domain:n,expires:i,httponly:o,maxage:a,path:l,samesite:h,secure:u}=Object.fromEntries(s.map(([e,t])=>[e.toLowerCase(),t])),d={name:t,value:decodeURIComponent(r),domain:n,...i&&{expires:new Date(i)},...o&&{httpOnly:!0},..."string"==typeof a&&{maxAge:Number(a)},path:l,...h&&{sameSite:k(h)},...u&&{secure:!0}};return E(d)}class T{_parsed=new Map;constructor(e){this._headers=e;let t=e.get("cookie");if(t){let r=A(t);for(let[s,n]of r)this._parsed.set(s,{name:s,value:n})}}[Symbol.iterator](){return this._parsed[Symbol.iterator]()}get size(){return this._parsed.size}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed);if(!e.length)return r.map(([e,t])=>t);let s="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(([e])=>e===s).map(([e,t])=>t)}has(e){return this._parsed.has(e)}set(...e){let[t,r]=1===e.length?[e[0].name,e[0].value]:e,s=this._parsed;return s.set(t,{name:t,value:r}),this._headers.set("cookie",Array.from(s).map(([e,t])=>U(t)).join("; ")),this}delete(e){let t=this._parsed,r=Array.isArray(e)?e.map(e=>t.delete(e)):t.delete(e);return this._headers.set("cookie",Array.from(t).map(([e,t])=>U(t)).join("; ")),r}clear(){return this.delete(Array.from(this._parsed.keys())),this}[Symbol.for("edge-runtime.inspect.custom")](){return`RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}}function N(e,t){for(let[,r]of(t.delete("set-cookie"),e)){let s=U(r);t.append("set-cookie",s)}}function W(e={name:"",value:""}){return e.maxAge&&(e.expires=new Date(Date.now()+1e3*e.maxAge)),(null===e.path||void 0===e.path)&&(e.path="/"),e}class D{_parsed=new Map;constructor(e){this._headers=e;let t=this._headers.getAll("set-cookie");for(let r of t){let s=O(r);s&&this._parsed.set(s.name,s)}}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed.values());if(!e.length)return r;let s="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(e=>e.name===s)}set(...e){let[t,r,s]=1===e.length?[e[0].name,e[0].value,e[0]]:e,n=this._parsed;return n.set(t,W({name:t,value:r,...s})),N(n,this._headers),this}delete(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this.set({name:t,value:"",expires:new Date(0)})}[Symbol.for("edge-runtime.inspect.custom")](){return`ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}}let H=Symbol("internal request");class M extends Request{constructor(e,t={}){let r="string"!=typeof e&&"url"in e?e.url:String(e);h(r),super(r,t),this[H]={cookies:new T(this.headers),geo:t.geo||{},ip:t.ip,url:new R(r,{headers:l(this.headers),nextConfig:t.nextConfig})}}[Symbol.for("edge-runtime.inspect.custom")](){return{cookies:this.cookies,geo:this.geo,ip:this.ip,nextUrl:this.nextUrl,url:this.url,bodyUsed:this.bodyUsed,cache:this.cache,credentials:this.credentials,destination:this.destination,headers:Object.fromEntries(this.headers),integrity:this.integrity,keepalive:this.keepalive,method:this.method,mode:this.mode,redirect:this.redirect,referrer:this.referrer,referrerPolicy:this.referrerPolicy,signal:this.signal}}get cookies(){return this[H].cookies}get geo(){return this[H].geo}get ip(){return this[H].ip}get nextUrl(){return this[H].url}get page(){throw new n}get ua(){throw new i}get url(){return this[H].url.toString()}}let z=Symbol("internal response"),F=new Set([301,302,303,307,308]);function J(e,t){var r;if(null==e?void 0:null==(r=e.request)?void 0:r.headers){if(!(e.request.headers instanceof Headers))throw Error("request.headers must be an instance of Headers");let s=[];for(let[n,i]of e.request.headers)t.set("x-middleware-request-"+n,i),s.push(n);t.set("x-middleware-override-headers",s.join(","))}}class B extends Response{constructor(e,t={}){super(e,t),this[z]={cookies:new D(this.headers),url:t.url?new R(t.url,{headers:l(this.headers),nextConfig:t.nextConfig}):void 0}}[Symbol.for("edge-runtime.inspect.custom")](){return{cookies:this.cookies,url:this.url,body:this.body,bodyUsed:this.bodyUsed,headers:Object.fromEntries(this.headers),ok:this.ok,redirected:this.redirected,status:this.status,statusText:this.statusText,type:this.type}}get cookies(){return this[z].cookies}static json(e,t){let r=Response.json(e,t);return new B(r.body,r)}static redirect(e,t){let r="number"==typeof t?t:(null==t?void 0:t.status)??307;if(!F.has(r))throw RangeError('Failed to execute "redirect" on "response": Invalid status code');let s="object"==typeof t?t:{},n=new Headers(null==s?void 0:s.headers);return n.set("Location",h(e)),new B(null,{...s,headers:n,status:r})}static rewrite(e,t){let r=new Headers(null==t?void 0:t.headers);return r.set("x-middleware-rewrite",h(e)),J(t,r),new B(null,{...t,headers:r})}static next(e){let t=new Headers(null==e?void 0:e.headers);return t.set("x-middleware-next","1"),J(e,t),new B(null,{...e,headers:t})}}function G(e,t){let r="string"==typeof t?new URL(t):t,s=new URL(e,t),n=`${r.protocol}//${r.host}`;return`${s.protocol}//${s.host}`===n?s.toString().replace(n,""):s.toString()}let K=["__nextFallback","__nextLocale","__nextDefaultLocale","__nextIsNotFound"],Q=["__nextDataReq"];function V(e,t){for(let r of K)e.delete(r);if(t)for(let s of Q)e.delete(s);return e}function X(e,t){return t?e.replace(/\.rsc($|\?)/,""):e}class Y extends M{constructor(e){super(e.input,e.init),this.sourcePage=e.page}get request(){throw new s({page:this.sourcePage})}respondWith(){throw new s({page:this.sourcePage})}waitUntil(){throw new s({page:this.sourcePage})}}let Z=[["RSC"],["Next-Router-State-Tree"],["Next-Router-Prefetch"],["x-vercel-sc-headers"]];async function ee(e){let t=void 0!==self.__BUILD_MANIFEST;e.request.url=X(e.request.url,!0);let r=new R(e.request.url,{headers:e.request.headers,nextConfig:e.request.nextConfig}),s=r.buildId;r.buildId="";let n=e.request.headers["x-nextjs-data"];n&&"/index"===r.pathname&&(r.pathname="/");let i=o(e.request.headers);if(!t)for(let a of Z)i.delete(a.toString().toLowerCase());V(r.searchParams,!0);let l=new Y({page:e.page,input:String(r),init:{body:e.request.body,geo:e.request.geo,headers:i,ip:e.request.ip,method:e.request.method,nextConfig:e.request.nextConfig}});n&&Object.defineProperty(l,"__isData",{enumerable:!1,value:!0});let h=new f({request:l,page:e.page}),u=await e.handler(l,h);if(u&&!(u instanceof Response))throw TypeError("Expected an instance of Response to be returned");let d=null==u?void 0:u.headers.get("x-middleware-rewrite");if(u&&d){let p=new R(d,{forceLocale:!0,headers:e.request.headers,nextConfig:e.request.nextConfig});p.host===l.nextUrl.host&&(p.buildId=s||p.buildId,u.headers.set("x-middleware-rewrite",String(p))),n&&u.headers.set("x-nextjs-rewrite",G(String(p),String(r)))}let g=null==u?void 0:u.headers.get("Location");if(u&&g){let m=new R(g,{forceLocale:!1,headers:e.request.headers,nextConfig:e.request.nextConfig});u=new Response(u.body,u),m.host===l.nextUrl.host&&(m.buildId=s||m.buildId,u.headers.set("Location",String(m))),n&&(u.headers.delete("Location"),u.headers.set("x-nextjs-redirect",G(String(m),String(r))))}return{response:u||B.next(),waitUntil:Promise.all(h[c])}}function et(e){return`The edge runtime does not support Node.js '${e}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`}function er(e){let t=new Proxy(function(){},{get(t,r){if("then"===r)return{};throw Error(et(e))},construct(){throw Error(et(e))},apply(r,s,n){if("function"==typeof n[0])return n[0](t);throw Error(et(e))}});return new Proxy({},{get:()=>t})}process!==r.g.process&&(process.env=r.g.process.env,r.g.process=process),Object.defineProperty(globalThis,"__import_unsupported",{value:er,enumerable:!1,configurable:!1});var es=r(7127),en=es.middleware||es.default;if("function"!=typeof en)throw Error('The Edge Function "pages/api/hello" must export a `default` function');function ei(e){return ee({...e,page:"/api/hello",handler:en})}},7127:(e,t,r)=>{"use strict";r.r(t),r.d(t,{config:()=>s});let s={runtime:"experimental-edge"}}},e=>{var t=e(e.s=4353);(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_pages/api/hello"]=t}]);
//# sourceMappingURL=hello.js.map