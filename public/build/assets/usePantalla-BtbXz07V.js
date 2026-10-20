import{c as d}from"./createLucideIcon-CR1SPsTk.js";import{r as i}from"./app-DeVel9UL.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]],m=d("file-spreadsheet",o);function s(t){const[a,r]=i.useState(()=>typeof window>"u"||!window.matchMedia?!1:window.matchMedia(t).matches);return i.useEffect(()=>{if(!window.matchMedia)return;const n=window.matchMedia(t),e=()=>r(n.matches);return n.addEventListener("change",e),window.addEventListener("resize",e),e(),()=>{n.removeEventListener("change",e),window.removeEventListener("resize",e)}},[t]),a}function u(){return s("(min-width: 1024px)")}export{m as F,u};
