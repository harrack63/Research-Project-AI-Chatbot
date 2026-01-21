import{r as o}from"./index.4MrhoUYF.js";import{u as w,B as h,j as i}from"./auth.CJjN_jzn.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),c=(...t)=>t.filter((e,r,n)=>!!e&&e.trim()!==""&&n.indexOf(e)===r).join(" ").trim();/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var C={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=o.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:r=2,absoluteStrokeWidth:n,className:a="",children:s,iconNode:d,...f},l)=>o.createElement("svg",{ref:l,...C,width:e,height:e,stroke:t,strokeWidth:n?Number(r)*24/Number(e):r,className:c("lucide",a),...f},[...d.map(([m,p])=>o.createElement(m,p)),...Array.isArray(s)?s:[s]]));/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=(t,e)=>{const r=o.forwardRef(({className:n,...a},s)=>o.createElement(L,{ref:s,iconNode:e,className:c(`lucide-${g(t)}`,n),...a}));return r.displayName=`${t}`,r};/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=u("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=u("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);function v({children:t}){const{isSignedIn:e,isLoaded:r}=w();return o.useEffect(()=>{e||(window.location.href=`${h}/sign-in`)},[r,e]),o.useMemo(()=>e?i.jsx(i.Fragment,{children:t}):null,[t,e,r])}export{v as A,k as C,E as L,u as c};
