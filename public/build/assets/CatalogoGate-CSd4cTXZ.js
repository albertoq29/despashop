import{r as a,j as e,Y as u,y as p}from"./app-BBj3LFdO.js";const v=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes float {
    0%, 100% { transform: translateY(0px) rotate(-2deg); }
    50%       { transform: translateY(-10px) rotate(2deg); }
}
@keyframes shimmer-bg {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-5px); }
    80%       { transform: translateX(5px); }
}
.animate-fadeInUp { animation: fadeInUp 0.6s ease both; }
.animate-float    { animation: float 3s ease-in-out infinite; }
.animate-shimmer-bg {
    background: linear-gradient(270deg, #fce7f3, #f3e8ff, #fce7f3, #ffe4e6);
    background-size: 400% 400%;
    animation: shimmer-bg 6s ease infinite;
}
.shake { animation: shake 0.4s ease; }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }

/* Partículas decorativas */
.particle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.12;
    pointer-events: none;
}
`,b=["💄","💅","✨","🌸","💋","🌷","💕","🎀"];function k({error:n}){const[s,m]=a.useState(""),[i,x]=a.useState(!1),[o,c]=a.useState(!1),[h,d]=a.useState(!1),l=a.useRef(null);a.useEffect(()=>{l.current&&l.current.focus()},[]),a.useEffect(()=>{n&&(d(!0),setTimeout(()=>d(!1),450))},[n]);const f=t=>{t.preventDefault(),s&&(c(!0),p.post(route("catalogo.privado.post"),{password:s},{onFinish:()=>c(!1)}))};return e.jsxs("div",{className:"min-h-screen flex items-center justify-center px-4 py-12 animate-shimmer-bg relative overflow-hidden",style:{fontFamily:"'Inter', sans-serif"},children:[e.jsx(u,{title:"Acceso al Catálogo – Every Beauty"}),e.jsx("style",{dangerouslySetInnerHTML:{__html:v}}),e.jsx("div",{className:"particle w-64 h-64 bg-marca-500 dark:bg-marca-600",style:{top:"-5%",left:"-8%"}}),e.jsx("div",{className:"particle w-96 h-96 bg-stone-500 dark:bg-stone-500",style:{bottom:"-10%",right:"-12%"}}),e.jsx("div",{className:"particle w-32 h-32 bg-marca-300 dark:bg-marca-800",style:{top:"20%",right:"5%"}}),e.jsx("div",{className:"particle w-24 h-24 bg-fuchsia-400",style:{bottom:"25%",left:"3%"}}),e.jsx("div",{className:"absolute inset-0 overflow-hidden pointer-events-none select-none","aria-hidden":!0,children:b.map((t,r)=>e.jsx("span",{className:"absolute text-2xl md:text-3xl animate-float opacity-20",style:{left:`${8+r*12}%`,top:`${10+r%3*28}%`,animationDelay:`${r*.4}s`,animationDuration:`${3+r*.3}s`},children:t},r))}),e.jsxs("div",{className:"relative z-10 w-full max-w-md animate-fadeInUp",children:[e.jsxs("div",{className:"bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-pink-200/60 border border-white/60 overflow-hidden",children:[e.jsxs("div",{className:"bg-gradient-to-br from-marca-600 dark:from-marca-500 via-marca-600 dark:via-marca-500 to-fuchsia-600 px-8 pt-10 pb-8 text-center relative overflow-hidden",children:[e.jsx("div",{className:"absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"}),e.jsx("div",{className:"absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"}),e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"text-5xl mb-3 animate-float inline-block",children:"🔐"}),e.jsx("h1",{className:"text-2xl font-extrabold text-white tracking-tight",children:"Acceso Exclusivo"}),e.jsx("p",{className:"text-marca-100 dark:text-marca-950 text-sm mt-1.5 font-medium",children:"Catálogo privado de Every Beauty"})]})]}),e.jsxs("div",{className:"px-8 py-8",children:[e.jsxs("p",{className:"text-center text-stone-500 dark:text-stone-400 text-sm mb-6 leading-relaxed",children:["Esta sección es exclusiva. ",e.jsx("br",{className:"hidden sm:block"}),"Ingresa la contraseña para acceder al catálogo."]}),e.jsxs("form",{onSubmit:f,className:"space-y-4",children:[e.jsxs("div",{className:h?"shake":"",children:[e.jsx("label",{className:"block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2",children:"Contraseña"}),e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-marca-500 dark:text-marca-400",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"})})}),e.jsx("input",{ref:l,type:i?"text":"password",value:s,onChange:t=>m(t.target.value),placeholder:"••••••••",className:"w-full pl-12 pr-12 py-3.5 bg-stone-50 dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring focus:ring-marca-200 dark:focus:ring-marca-900 focus:ring-opacity-50 rounded-2xl text-stone-800 dark:text-stone-200 font-medium text-base transition-all outline-none placeholder-stone-300 dark:placeholder-stone-600",autoComplete:"current-password",spellCheck:!1}),e.jsx("button",{type:"button",onClick:()=>x(t=>!t),className:"absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 dark:text-stone-500 hover:text-marca-600 dark:hover:text-marca-400 transition-colors",tabIndex:-1,children:i?e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"})}):e.jsxs("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:[e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M15 12a3 3 0 11-6 0 3 0 016 0z"}),e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"})]})})]}),n&&e.jsxs("div",{className:"mt-2.5 flex items-center gap-2 text-red-500 dark:text-red-400 text-xs font-semibold animate-fadeInUp",children:[e.jsx("svg",{className:"w-4 h-4 flex-shrink-0",fill:"currentColor",viewBox:"0 0 20 20",children:e.jsx("path",{fillRule:"evenodd",d:"M18 10a8 8 0 11-16 0 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",clipRule:"evenodd"})}),n]})]}),e.jsx("button",{type:"submit",disabled:o||!s,className:"w-full py-4 px-6 rounded-2xl text-base font-extrabold text-white shadow-lg shadow-pink-300/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2",style:{background:o||!s?void 0:"linear-gradient(135deg, #ec4899, #a855f7)"},children:o?e.jsxs(e.Fragment,{children:[e.jsxs("svg",{className:"animate-spin w-5 h-5",fill:"none",viewBox:"0 0 24 24",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 5.373 0 12h4z"})]}),"Verificando..."]}):e.jsxs(e.Fragment,{children:[e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2.5",d:"M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"})}),"Ingresar al Catálogo"]})})]}),e.jsx("div",{className:"mt-6 text-center",children:e.jsx("a",{href:route("home"),className:"text-xs text-stone-400 dark:text-stone-500 hover:text-marca-600 dark:hover:text-marca-400 transition-colors font-medium",children:"← Volver a la tienda"})})]})]}),e.jsxs("p",{className:"text-center text-xs text-stone-400/80 dark:text-stone-600/80 mt-5 font-medium",children:["Every Beauty © ",new Date().getFullYear()]})]})]})}export{k as default};
