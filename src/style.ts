export const STYLE = `
:host{all:initial;--bg:#2c2c2c;--raise:#383838;--fg:#f5f5f5;--muted:#a3a3a3;--line:#ffffff1a;--hover:#ffffff14;--accent:#a970ff;--off:#5c5c5c;--shadow:#0000008c;--ease:cubic-bezier(.16,1,.3,1)}
@media (prefers-color-scheme:light){:host{--bg:#fff;--raise:#f5f5f5;--fg:#1e1e1e;--muted:#6e6e6e;--line:#0000001a;--hover:#0000000d;--accent:#8a3ffc;--off:#b3b3b3;--shadow:#1e1e1e33}}
*{box-sizing:border-box;margin:0;font:13px/1.5 Inter,system-ui,sans-serif;color:inherit}
[hidden]{display:none!important}
button{cursor:pointer;border:0;background:none;padding:0}
.i{width:16px;height:16px;flex:none}
.hl{position:fixed;left:0;top:0;pointer-events:none;opacity:0;border:1.5px solid var(--accent);border-radius:4px;z-index:2147483645;
box-shadow:0 0 0 1px #a970ff59,0 0 12px 2px #a970ffcc,0 0 32px 8px #a970ff66,inset 0 0 12px #a970ff4d;
transition:transform .22s cubic-bezier(.16,1,.3,1),width .22s cubic-bezier(.16,1,.3,1),height .22s cubic-bezier(.16,1,.3,1),opacity .15s}
.hl.show{opacity:1}
.layer{position:fixed;inset:0;pointer-events:none;z-index:2147483646}
.layer.enter .pin{animation:rise .3s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(-100%) scale(.6)}}
@keyframes fade{from{opacity:0;translate:0 8px}}
.hint,.tool{animation:fade .3s var(--ease)}
@keyframes pop{from{opacity:0;transform:scale(.96) translateY(4px)}}
.pin{position:fixed;pointer-events:auto;transform:translateY(-100%);display:flex;align-items:flex-start;gap:8px;padding:6px;width:40px;height:40px;overflow:hidden;interpolate-size:allow-keywords;background:var(--bg);color:var(--fg);border-radius:20px 20px 20px 4px;box-shadow:0 0 0 1px var(--line),0 4px 12px var(--shadow);text-align:left;transition:width .32s var(--ease),height .32s var(--ease),transform .2s var(--ease),box-shadow .2s}
.dot{position:relative;flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:600;color:#fff;background:var(--off);transition:background .2s}
.pin{cursor:pointer}
.tool{position:fixed;right:16px;bottom:16px;width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:var(--bg);color:var(--muted);box-shadow:0 0 0 1px var(--line),0 4px 16px var(--shadow);z-index:2147483646;transition:color .15s,box-shadow .15s}
.tool:hover{color:var(--fg)}
.tool[aria-pressed=true]{color:var(--accent);box-shadow:0 0 0 1.5px var(--accent),0 4px 16px var(--shadow)}
.tool .i{width:18px;height:18px}.open .dot{background:#ffc700}
.in-progress .dot{background:var(--accent)}.resolved .dot{background:#14ae5c}
.dot .i{width:18px;height:18px}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(1turn)}}
.ask{position:absolute;right:-3px;top:-3px;width:14px;height:14px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--bg)}
.body{display:flex;flex:none;flex-direction:column;width:244px;padding:4px 12px 6px 0;opacity:0;transition:opacity .18s}
.body .txt{margin-top:2px}
.body .tags{margin-top:12px}
.pin:not(.sel):hover{z-index:1}
.pin:not(.sel):is(:hover,:focus-within){width:auto;height:auto}
.pin:not(.sel):is(:hover,:focus-within) .body{opacity:1;transition-delay:.06s}
.pin.flip-x{flex-direction:row-reverse;translate:calc(40px - 100%) 0}.flip-x .body{padding:4px 0 6px 12px}
.pin.flip-y{transform:none;border-radius:4px 20px 20px 20px}
.pin.sel{box-shadow:0 0 0 2px var(--accent),0 4px 12px var(--shadow)}
.draft .dot{background:var(--accent)}
.who{display:flex;align-items:baseline;gap:8px;white-space:nowrap}.who b{font-weight:600}
time,.mono{color:var(--muted)}
.mono{font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.copy{display:flex;align-items:center;gap:4px;height:22px;margin:-3px -6px -3px auto;padding:0 6px;border-radius:6px;color:var(--muted);transition:background .15s,color .15s}
.copy .i,.id .i{width:12px;height:12px}.copy:hover{background:var(--hover);color:var(--fg)}.copy.done,.id.done{color:#14ae5c}
.txt{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.tags{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:12px}
.tags span{display:flex;align-items:center;gap:4px}
.tags .i{width:14px;height:14px}
.hint{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg);color:var(--fg);border-radius:999px;box-shadow:0 0 0 1px var(--line),0 4px 16px var(--shadow);z-index:2147483646;white-space:nowrap}
.hint kbd{font:inherit;color:var(--muted)}
.orphan{padding:2px 8px;border-radius:999px;background:#e5214f;color:#fff}
.panel{position:fixed;width:336px;background:var(--bg);color:var(--fg);border-radius:28px;animation:pop .22s var(--ease);box-shadow:0 0 0 1px var(--line),0 16px 40px var(--shadow);z-index:2147483647}
header{display:flex;align-items:center;gap:4px;height:56px;padding:0 12px 0 16px;border-bottom:1px solid var(--line)}
header b{font-weight:600;margin-right:4px}
.id{display:flex;align-items:center;gap:2px;height:24px;padding:0 6px;border-radius:6px}
.id .i{width:12px;height:12px}
.sp{flex:1}
.ico{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;transition:background .15s}
.ico .i{width:18px;height:18px}
.ico:hover,.id:hover,.chip:hover,.pop button:hover{background:var(--hover)}
.meta{display:flex;flex-wrap:wrap;gap:8px;padding:16px 16px 8px}
.chip{display:flex;align-items:center;gap:6px;height:28px;padding:0 6px 0 8px;border-radius:8px;background:var(--raise);white-space:nowrap;transition:background .15s}
.chip .caret{width:12px;height:12px;color:var(--muted)}
.priority-high .i:first-child{color:#f24822}.priority-urgent .i:first-child{color:#e5214f}
.status-in-progress .i:first-child{color:var(--accent)}.status-resolved .i:first-child,.status-verified .i:first-child{color:#14ae5c}
.menu,.pop{position:absolute;z-index:1;display:flex;flex-direction:column;min-width:168px;padding:4px;background:var(--bg);border-radius:10px;box-shadow:0 0 0 1px var(--line),0 8px 24px var(--shadow);transform-origin:top left;animation:pop .18s var(--ease)}
.menu{right:84px;top:52px;transform-origin:top right}
.pop button,.menu button{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:6px;text-align:left;transition:background .12s}
.pop .ok{margin-left:auto;visibility:hidden}.pop [aria-checked=true] .ok{visibility:visible}
.menu button{color:#f24822}
.msgs{display:flex;flex-direction:column;max-height:min(360px,50vh);overflow:auto}
.msg{display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px 12px;align-items:center;padding:8px 16px}
.msg p{grid-column:2;white-space:pre-wrap;overflow-wrap:anywhere}
.av{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:600;color:#fff;background:var(--off)}
.av.agent{background:var(--accent)}
form{display:flex;gap:12px;align-items:flex-end;padding:8px 16px 16px}
form .av{margin-bottom:4px}
.input{flex:1;min-width:0;display:flex;align-items:flex-end;gap:8px;padding:3px 3px 3px 13px;background:var(--raise);border:1px solid var(--line);border-radius:12px;transition:border-color .2s}
.input:focus-within{border-color:var(--accent)}
textarea{flex:1;min-width:0;width:100%;min-height:28px;max-height:140px;padding:4px 0;border:0;outline:0!important;background:none;resize:none;field-sizing:content;overflow-wrap:anywhere}
textarea::placeholder{color:var(--muted)}
.send{flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:var(--off);color:#fff;transition:background .2s,transform .15s var(--ease)}
.send:active{transform:scale(.94)}
.input:has(textarea:not(:placeholder-shown)) .send{background:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`
