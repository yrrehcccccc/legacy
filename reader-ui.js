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
