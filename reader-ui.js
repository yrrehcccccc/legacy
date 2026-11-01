(() => {
  'use strict';
  function decorateChats(container = document) {
    if (window.ReaderChatLayout) return window.ReaderChatLayout.decorate(container);
    const bubbleSelector = '.rt-bubble,.sf-bubble';
    const chatSelector = '.rt-chat,.sf-chat';
    const isSpacer = node => node.nodeType === Node.ELEMENT_NODE && (
      node.matches('br,.blank-line') || (node.matches('p,.prose-line') && !node.textContent.trim() &&
        !node.querySelector('img,svg,video,audio,iframe,input,button'))
    );
    function previousContent(element) {
      const spacers = [];
      let node = element.previousSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent.trim()) return null;
        } else if (isSpacer(node)) spacers.push(node);
        else if (node.nodeType === Node.ELEMENT_NODE) return { node, spacers };
        node = node.previousSibling;
      }
      return { node:null, spacers };
    }
    function timestampBefore(bubble,row,chat) {
      if (row?.querySelector(':scope > .reader-chat-meta')) return null;
      let previous = previousContent(row || bubble);
      if (previous && !previous.node && chat.querySelector(bubbleSelector) === bubble) previous = previousContent(chat);
      const node = previous?.node;
      if (!node || !node.matches('p,.prose-line,[data-chat-time]') || node.matches(bubbleSelector)) return null;
      const label = node.textContent.trim();
      if (!/^(?:[^，。！？!?：:|｜\n]{1,32}[ \t\u3000]+)?(?:[01]?\d|2[0-3])[:：][0-5]\d$/u.test(label)) return null;
      return previous;
    }
    function removeTextRange(element,start,end) {
      const walker = document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      const nodes = [];
      let offset = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        nodes.push({ node,start:offset,end:offset + node.data.length });
        offset += node.data.length;
      }
      nodes.forEach(record=>{
        const from = Math.max(start,record.start) - record.start;
        const to = Math.min(end,record.end) - record.start;
        if (to > from) record.node.deleteData(from,to - from);
      });
    }
    container.querySelectorAll(bubbleSelector).forEach(bubble=>{
      const chat = bubble.closest(chatSelector);
      if (!chat) return;
      let row = bubble.parentElement?.classList.contains('reader-message') ? bubble.parentElement : null;
      const value = bubble.textContent;
      const read = /\s*[（(]\s*已读\s*[）)]\s*$/u.exec(value);
      const canMoveRead = read && (value.slice(0,read.index).trim() || bubble.querySelector('img,svg,video'));
      const stamp = timestampBefore(bubble,row,chat);
      if (!row && !canMoveRead && !stamp) return;
      if (!row) {
        row = document.createElement('div');
        row.className = 'reader-message';
        bubble.before(row);
        row.append(bubble);
      }
      row.dataset.chatLayout = 'line';
      row.classList.toggle('reader-message-self',bubble.matches('.rt-self,.sf-self'));
      if (canMoveRead) {
        removeTextRange(bubble,read.index,value.length);
        if (!row.querySelector(':scope > .reader-chat-read')) {
          const label = document.createElement('span');
          label.className = 'reader-chat-read';
          label.textContent = '已读';
          row.append(label);
        }
      }
      row.classList.toggle('reader-message-read',!!row.querySelector(':scope > .reader-chat-read'));
      if (stamp) {
        stamp.node.classList.add('reader-chat-meta');
        row.prepend(stamp.node);
        stamp.spacers.forEach(node=>node.remove());
      }
    });
  }

  window.ReaderUITemplate = Object.freeze({ decorateChats });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>decorateChats(),{once:true});
  else decorateChats();
})();

(() => {
  'use strict';
  const init = () => {
    const article=document.querySelector('article.chapter-body');
    if(!article || article.dataset.legacyFormatted) return;
    article.dataset.legacyFormatted='true';
    const lines=[...article.querySelectorAll('[data-source-line]')];
    const lineText=el=>el.textContent.trim();
    const wrapRange=(start,end,className)=>{
      if(!start || !end || start.parentNode!==end.parentNode)return;
      const section=document.createElement('section');section.className=className;
      start.before(section);let current=start;
      while(current){const next=current.nextSibling;section.append(current);if(current===end)break;current=next;}
    };
    const title=lines.find(el=>lineText(el)==='【遗产分割协议书】');
    if(title){
      let node=title,end=title,receivers=0;
      while(node){
        const text=lineText(node);
        if(node!==title && /^\d+(?:\.\d+)?$/.test(text))break;
        if(text)end=node;
        if(text==='受让人：' && ++receivers===3)break;
        node=node.nextElementSibling;
      }
      wrapRange(title,end,'rt-card legacy-legal');
    }
    for(const [attribution,count] of [
      ['——三岛由纪夫《假面的告白》',1],
      ['——山下达郎《クリスマス·イブ》',2],
      ['クリープハイプ《108円の恋》',4],
      ['——福楼拜致厄内斯特·费多的信，1872年',1]
    ]){
      const end=lines.find(el=>lineText(el)===attribution);if(!end)continue;
      let start=end,remaining=count;
      while(remaining && start.previousElementSibling){start=start.previousElementSibling;if(lineText(start))remaining--;}
      if(!remaining)wrapRange(start,end,'legacy-quotation');
    }
    lines.filter(el=>lineText(el)==='“多希望这一切都是梦，至今仍能在梦中与你重逢。”').forEach(el=>el.classList.add('legacy-quotation-line'));
    const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())if(!walker.currentNode.parentElement.closest('strong,b,script,style'))nodes.push(walker.currentNode);
    for(const node of nodes){
      const value=node.data;const regex=/【[^【】]+】|〖[^〖〗]+〗|君子讷于言而敏于行。?/gu;
      if(!regex.test(value))continue;regex.lastIndex=0;
      const fragment=document.createDocumentFragment();let offset=0;
      for(const match of value.matchAll(regex)){
        fragment.append(value.slice(offset,match.index));const strong=document.createElement('strong');
        if(match[0].startsWith('君子')){const em=document.createElement('em');em.textContent=match[0];strong.append(em);}else strong.textContent=match[0];
        fragment.append(strong);offset=match.index+match[0].length;
      }
      fragment.append(value.slice(offset));node.replaceWith(fragment);
    }
    document.querySelectorAll('.toc-menu').forEach(menu=>{
      if(menu.querySelector('a[href="intro.html"]'))return;
      const first=menu.querySelector('a[href="01.html"]');if(!first)return;
      const link=document.createElement('a');link.href='intro.html';link.textContent='引言';first.before(link);
    });
    if(/\/01\.html$/.test(location.pathname))document.querySelectorAll('.chapter-nav > a[href="index.html"]').forEach(link=>{link.href='intro.html';link.rel='prev';link.textContent='←引言';});
  };
  const style=document.createElement('style');style.textContent=`
    .legacy-legal{border-radius:14px;background:color-mix(in srgb,var(--bg,#eee8da) 91%,var(--ink,#332a22) 9%);font-size:max(11px,calc(var(--size,16px) - 2px));line-height:1.85}
    .legacy-legal .prose-line{font-size:inherit;line-height:inherit;text-indent:0}
    .legacy-legal .blank-line{height:.8em}
    .legacy-quotation,.legacy-quotation-line{font-weight:700;font-style:italic}
    article.chapter-body strong{font-weight:700}
  `;document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
