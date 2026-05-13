// 配置的 DOM 元素映射
const engineConfigMap = {
  baidu: 'baidu-config',
  baidu_llm: 'baidu_llm-config',
  tencent: 'tencent-config'
};

// 显示/隐藏对应引擎的配置面板
function showEngineConfig(engine) {
  // 隐藏所有配置
  Object.values(engineConfigMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // 显示当前引擎配置
  if (engineConfigMap[engine]) {
    const el = document.getElementById(engineConfigMap[engine]);
    if (el) el.style.display = 'block';
  }
}

// 同步两个百度配置面板（通用版和大模型版共用同一份 APP ID/密钥）
function syncBaiduFields(sourceId, targetId) {
  const src = document.getElementById(sourceId);
  const tgt = document.getElementById(targetId);
  if (src && tgt && src.value !== tgt.value) {
    tgt.value = src.value;
  }
}

// 保存设置
function saveSettings() {
  // 保证两个百度面板的值同步
  syncBaiduFields('baiduAppId', 'baiduAppId2');
  syncBaiduFields('baiduAppKey', 'baiduAppKey2');
  
  const settings = {
    translateEngine: document.getElementById('translateEngine').value,
    targetLang: document.getElementById('targetLang').value,
    baiduAppId: document.getElementById('baiduAppId').value,
    baiduAppKey: document.getElementById('baiduAppKey').value,
    tencentSecretId: document.getElementById('tencentSecretId').value,
    tencentSecretKey: document.getElementById('tencentSecretKey').value,
    tencentRegion: document.getElementById('tencentRegion').value
  };
  
  chrome.storage.sync.set(settings, () => {
    // 保存成功反馈
    document.getElementById('translateEngine').style.borderColor = '#34a853';
    setTimeout(() => {
      document.getElementById('translateEngine').style.borderColor = '#ddd';
    }, 500);
  });
}

// 读取设置
function loadSettings() {
  chrome.storage.sync.get({
    translateEngine: 'google',
    targetLang: 'zh-CN',
    baiduAppId: '',
    baiduAppKey: '',
    tencentSecretId: '',
    tencentSecretKey: '',
    tencentRegion: 'ap-beijing'
  }, (result) => {
    document.getElementById('translateEngine').value = result.translateEngine;
    document.getElementById('targetLang').value = result.targetLang;
    document.getElementById('baiduAppId').value = result.baiduAppId;
    document.getElementById('baiduAppKey').value = result.baiduAppKey;
    document.getElementById('baiduAppId2').value = result.baiduAppId;
    document.getElementById('baiduAppKey2').value = result.baiduAppKey;
    document.getElementById('tencentSecretId').value = result.tencentSecretId;
    document.getElementById('tencentSecretKey').value = result.tencentSecretKey;
    document.getElementById('tencentRegion').value = result.tencentRegion;
    
    showEngineConfig(result.translateEngine);
  });
}

// 引擎免费额度（每月字符数）
const ENGINE_QUOTA = {
  baidu: 1000000,
  baidu_llm: 1000000,
  tencent: 5000000
};

// 千分位格式化
function formatNum(n) {
  return n.toLocaleString('en-US');
}

// 获取当前月份键 YYYY-MM
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 渲染单个引擎的用量
function renderUsage(engine, used) {
  const quota = ENGINE_QUOTA[engine] || 0;
  const left = Math.max(0, quota - used);
  const percent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  
  const usedEl = document.getElementById(`${engine}-usage-used`);
  const leftEl = document.getElementById(`${engine}-usage-left`);
  const barEl = document.getElementById(`${engine}-usage-bar`);
  
  if (usedEl) usedEl.textContent = formatNum(used);
  if (leftEl) leftEl.textContent = formatNum(left);
  if (barEl) {
    barEl.style.width = `${percent}%`;
    barEl.classList.remove('warn', 'danger');
    if (percent >= 90) barEl.classList.add('danger');
    else if (percent >= 70) barEl.classList.add('warn');
  }
  
  // 同时给数值标记颜色
  [usedEl, leftEl].forEach(el => {
    if (!el) return;
    el.classList.remove('warn', 'danger');
    if (percent >= 90) el.classList.add('danger');
    else if (percent >= 70) el.classList.add('warn');
  });
}

// 加载并显示所有引擎的用量
function loadUsage() {
  chrome.storage.local.get({ usage: {} }, (data) => {
    const month = currentMonthKey();
    const usage = data.usage || {};
    Object.keys(ENGINE_QUOTA).forEach(engine => {
      const used = (usage[engine] && usage[engine][month]) || 0;
      renderUsage(engine, used);
    });
  });
}

// 重置某引擎本月统计
function resetUsage(engine) {
  if (!confirm(`确定要清空"${engine}"本月本地统计吗？\n（不影响实际平台用量）`)) return;
  chrome.storage.local.get({ usage: {} }, (data) => {
    const usage = data.usage || {};
    const month = currentMonthKey();
    if (usage[engine]) {
      usage[engine][month] = 0;
    }
    chrome.storage.local.set({ usage }, () => {
      renderUsage(engine, 0);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的设置
  loadSettings();
  
  // 加载用量统计
  loadUsage();
  
  // 监听 storage 变化，实时刷新用量（翻译中的请求会更新）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.usage) {
      loadUsage();
    }
  });
  
  // 重置按钮事件
  document.querySelectorAll('.usage-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const engine = btn.dataset.engine;
      if (engine) resetUsage(engine);
    });
  });
  
  // 监听翻译引擎切换
  document.getElementById('translateEngine').addEventListener('change', (e) => {
    showEngineConfig(e.target.value);
    saveSettings();
  });
  
  // 监听目标语言切换
  document.getElementById('targetLang').addEventListener('change', saveSettings);
  
  // 监听所有输入框变化
  const inputs = ['baiduAppId', 'baiduAppKey', 
                  'baiduAppId2', 'baiduAppKey2',
                  'tencentSecretId', 'tencentSecretKey', 'tencentRegion'];
  
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        // 反向同步：在大模型面板修改后同步到通用面板
        if (id === 'baiduAppId2') document.getElementById('baiduAppId').value = el.value;
        if (id === 'baiduAppKey2') document.getElementById('baiduAppKey').value = el.value;
        saveSettings();
      });
      el.addEventListener('input', () => {
        if (id === 'baiduAppId2') document.getElementById('baiduAppId').value = el.value;
        if (id === 'baiduAppKey2') document.getElementById('baiduAppKey').value = el.value;
        saveSettings();
      });
    }
  });
});
