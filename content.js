// 划词翻译插件 - Content Script
// 通过消息传递让 background service worker 处理 API 请求（避免 CORS 问题）

let translateButton = null;
let translationPopup = null;
let settings = {
  translateEngine: 'google',
  targetLang: 'zh-CN',
  baiduAppId: '',
  baiduAppKey: '',
  tencentSecretId: '',
  tencentSecretKey: '',
  tencentRegion: 'ap-beijing',
  selectedLlmIndex: ''
};

// 读取设置
function loadSettings() {
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({
      translateEngine: 'google',
      targetLang: 'zh-CN',
      baiduAppId: '',
      baiduAppKey: '',
      tencentSecretId: '',
      tencentSecretKey: '',
      tencentRegion: 'ap-beijing',
      selectedLlmIndex: ''
    }, (result) => {
      settings = result;
    });
    
    // 监听设置变化
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (const key in changes) {
          if (key in settings) {
            settings[key] = changes[key].newValue;
          }
        }
      }
    });
  }
}

// 通过 background service worker 调用翻译 API（避免 CORS 问题）
function translateText(text) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      settings: settings
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve('扩展通信错误: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response) {
        resolve('翻译服务无响应');
        return;
      }
      
      if (response.success) {
        resolve(response.result);
      } else {
        resolve(response.error || '翻译失败');
      }
    });
  });
}

// 创建翻译按钮
function createTranslateButton() {
  if (translateButton) return;
  
  translateButton = document.createElement('div');
  translateButton.textContent = '翻译';
  translateButton.id = 'translate-button';
  translateButton.style.cssText = `
    position: fixed;
    z-index: 999999;
    background: #4285f4;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    user-select: none;
    display: none;
  `;
  
  translateButton.addEventListener('click', handleTranslate);
  document.body.appendChild(translateButton);
}

// 创建翻译结果弹窗
function createTranslationPopup() {
  if (translationPopup) return;
  
  translationPopup = document.createElement('div');
  translationPopup.id = 'translation-popup';
  translationPopup.style.cssText = `
    position: fixed;
    z-index: 999999;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    max-width: 400px;
    min-width: 200px;
    display: none;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
  `;
  
  // 拖动状态
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  
  // 鼠标悬停时，在上边缘区域显示移动光标
  translationPopup.addEventListener('mousemove', (e) => {
    if (isDragging) return;
    
    const rect = translationPopup.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    // 在上边缘 15px 范围内显示移动光标
    if (relativeY <= 15) {
      translationPopup.style.cursor = 'move';
    } else {
      translationPopup.style.cursor = 'default';
    }
  });
  
  // 鼠标离开时恢复默认光标
  translationPopup.addEventListener('mouseleave', () => {
    if (!isDragging) {
      translationPopup.style.cursor = 'default';
    }
  });
  
  // 拖动开始 - 只在上边缘 15px 范围内允许拖动
  translationPopup.addEventListener('mousedown', (e) => {
    // 点击关闭按钮时不触发拖动
    if (e.target.tagName === 'SPAN') return;
    
    const rect = translationPopup.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    // 只在上边缘 15px 范围内允许拖动
    if (relativeY > 15) return;
    
    isDragging = true;
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    translationPopup.style.cursor = 'grabbing';
    translationPopup.style.userSelect = 'none';
  });
  
  // 拖动中
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffsetX;
    const newY = e.clientY - dragOffsetY;
    
    // 限制在视口范围内
    const maxX = window.innerWidth - translationPopup.offsetWidth;
    const maxY = window.innerHeight - translationPopup.offsetHeight;
    
    translationPopup.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
    translationPopup.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
  });
  
  // 拖动结束
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      translationPopup.style.cursor = 'default';
      translationPopup.style.userSelect = 'auto';
    }
  });
  
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 12px;
    cursor: pointer;
    font-size: 20px;
    color: #999;
    line-height: 1;
  `;
  closeBtn.addEventListener('click', () => {
    translationPopup.style.display = 'none';
  });
  
  const content = document.createElement('div');
  content.id = 'translation-content';
  content.style.cssText = 'margin-top: 8px;';
  
  translationPopup.appendChild(closeBtn);
  translationPopup.appendChild(content);
  document.body.appendChild(translationPopup);
}

// 显示翻译按钮
function showTranslateButton(x, y) {
  if (!translateButton) createTranslateButton();
  
  translateButton.style.left = `${x}px`;
  translateButton.style.top = `${y + 10}px`;
  translateButton.style.display = 'block';
}

// 隐藏翻译按钮
function hideTranslateButton() {
  if (translateButton) {
    translateButton.style.display = 'none';
  }
}

// 显示翻译结果
function showTranslationResult(text, x, y) {
  if (!translationPopup) createTranslationPopup();
  
  const content = translationPopup.querySelector('#translation-content');
  content.textContent = text;
  
  // 确保弹窗在视口内
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x;
  let top = y + 20;
  
  // 临时显示以获取尺寸
  translationPopup.style.display = 'block';
  translationPopup.style.visibility = 'hidden';
  
  const popupWidth = translationPopup.offsetWidth;
  const popupHeight = translationPopup.offsetHeight;
  
  // 调整位置
  if (left + popupWidth > viewportWidth) {
    left = viewportWidth - popupWidth - 20;
  }
  if (top + popupHeight > viewportHeight) {
    top = y - popupHeight - 20;
  }
  
  translationPopup.style.left = `${Math.max(10, left)}px`;
  translationPopup.style.top = `${Math.max(10, top)}px`;
  translationPopup.style.visibility = 'visible';
}

// 处理翻译点击
async function handleTranslate() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (!text) return;
  
  hideTranslateButton();
  
  // 获取选中文本的位置
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // 显示加载状态
  showTranslationResult('翻译中...', rect.left, rect.bottom);
  
  // 调用翻译API（通过 background service worker）
  const result = await translateText(text);
  
  // 显示翻译结果
  showTranslationResult(result, rect.left, rect.bottom);
}

// 监听文本选择
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // 检查是否点击了翻译按钮或弹窗
    if (translateButton && translateButton.contains(e.target)) return;
    if (translationPopup && translationPopup.contains(e.target)) return;
    
    if (text && text.length > 0) {
      showTranslateButton(e.clientX, e.clientY);
    } else {
      hideTranslateButton();
      if (translationPopup) {
        translationPopup.style.display = 'none';
      }
    }
  }, 10);
});

// 点击其他地方隐藏弹窗
document.addEventListener('mousedown', (e) => {
  if (translationPopup && !translationPopup.contains(e.target) && 
      translateButton && !translateButton.contains(e.target)) {
    translationPopup.style.display = 'none';
  }
});

// 初始化
loadSettings();
createTranslateButton();
createTranslationPopup();