const themes = [['黑白','#f8f7f3','#171714'],['暖棕','#eee8da','#332a22'],['灰黑','#dfe1dc','#252825'],['暖黑','#111923','#e9e3d7'],['咖啡','#ead6bd','#5a2923']];
const fonts = {serif:'"Noto Serif SC","Songti SC","STSong",serif',sans:'"Noto Sans SC","PingFang SC","Hiragino Sans GB",sans-serif',light:'"PingFang SC","Noto Sans SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',system:'system-ui,"PingFang SC","Microsoft YaHei",sans-serif'};
const root = document.documentElement;
const panel = document.querySelector('#settingsPanel');
const trigger = document.querySelector('#settingsButton');
const read = key => { try { return localStorage.getItem('legacy-reader-' + key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem('legacy-reader-' + key, value); } catch {} };
const select = (key, value) => document.querySelectorAll('[data-' + key + ']').forEach(button => {
  const active = button.dataset[key] === String(value);
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
});
function setOpen(open, restoreFocus = false) {
  panel.inert = !open;
  panel.classList.toggle('open', open);
  trigger.setAttribute('aria-expanded', String(open));
  if (open) panel.querySelector('[data-close]').focus();
  else if (restoreFocus) trigger.focus();
}
trigger.onclick = () => setOpen(!panel.classList.contains('open'));
panel.querySelector('[data-close]').onclick = () => setOpen(false, true);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.classList.contains('open')) setOpen(false, true); });
document.addEventListener('click', event => { if (!panel.contains(event.target) && !trigger.contains(event.target)) setOpen(false); });
themes.forEach(([name, bg, ink], index) => {
  const button = document.createElement('button');
  button.className = 'palette';
  button.dataset.theme = index;
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.setProperty('--a', bg);
  swatch.style.setProperty('--b', ink);
  swatch.setAttribute('aria-hidden', 'true');
  button.append(swatch, name);
  button.onclick = () => {
    root.dataset.theme = String(index);
    root.style.setProperty('--bg', bg);
    root.style.setProperty('--ink', ink);
    select('theme', index);
    save('theme', index);
  };
  document.querySelector('#palettes').append(button);
});
document.querySelectorAll('[data-font]').forEach(button => button.onclick = () => {
  const font = button.dataset.font;
  root.style.setProperty('--body', fonts[font]);
  root.style.setProperty('--weight', font === 'light' ? 300 : 400);
  select('font', font);
  save('font', font);
});
document.querySelectorAll('[data-size]').forEach(button => button.onclick = () => {
  root.style.setProperty('--size', button.dataset.size + 'px');
  select('size', button.dataset.size);
  save('size', button.dataset.size);
});
const theme = Number(read('theme') ?? 1);
document.querySelector('[data-theme="' + (Number.isInteger(theme) && themes[theme] ? theme : 1) + '"]').click();
if (read('font-default-version') !== '1') {
  if (read('font') === null || read('font') === 'light') save('font','serif');
  save('font-default-version','1');
}
const font = read('font');
document.querySelector('[data-font="' + (Object.hasOwn(fonts, font) ? font : 'serif') + '"]').click();
const size = read('size');
document.querySelector('[data-size="' + (['12','14','16','18','20','23'].includes(size) ? size : '16') + '"]').click();

document.querySelectorAll('.toc-dropdown').forEach(details=>{
  details.addEventListener('toggle',()=>{
    if(!details.open)return;
    document.querySelectorAll('.toc-dropdown').forEach(other=>{if(other!==details)other.open=false;});
    const menu=details.querySelector('.toc-menu');
    const current=menu.querySelector('[aria-current="page"]');
    if(current)menu.scrollTop=Math.max(0,current.offsetTop-menu.offsetTop-menu.clientHeight/2);
  });
});
document.addEventListener('click',event=>document.querySelectorAll('.toc-dropdown[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.toc-dropdown[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
