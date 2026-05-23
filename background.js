// Background service worker - 用于代理跨域 API 请求
// 解决 Manifest V3 中 content script CORS 限制问题

// SHA-256 加密 - 返回 hex 字符串
async function sha256Hex(message) {
  const msgBuffer = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256 - 返回 ArrayBuffer
async function hmacSha256(key, message) {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return signature;
}

// HMAC-SHA256 - 返回 hex 字符串
async function hmacSha256Hex(key, message) {
  const buffer = await hmacSha256(key, message);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 谷歌翻译
async function translateByGoogle(text, settings) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${settings.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const data = await response.json();
    if (data && data[0]) {
      return { success: true, result: data[0].map(item => item[0]).join('') };
    }
    return { success: false, error: '翻译结果为空' };
  } catch (error) {
    return { success: false, error: `谷歌翻译错误: ${error.message}` };
  }
}

// MD5 加密 - 用于百度翻译签名
function md5(string) {
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function add32(x, y) {
    let lsw = (x & 0xFFFF) + (y & 0xFFFF);
    let msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function md5blk(s) {
    let md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function md51(s) {
    let n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= s.length; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }
    s = s.substring(i - 64);
    let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) { tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function rhex(n) {
    let s = '', j;
    for (j = 0; j < 4; j++) {
      s += hex.charAt((n >> (j * 8 + 4)) & 0x0F) + hex.charAt((n >> (j * 8)) & 0x0F);
    }
    return s;
  }
  let hex = '0123456789abcdef';
  let x = md51(string);
  return rhex(x[0]) + rhex(x[1]) + rhex(x[2]) + rhex(x[3]);
}

// 百度通用错误码说明
const BAIDU_ERROR_MAP = {
  '52001': '请求超时，请重试',
  '52002': '系统错误，请重试',
  '52003': '未授权用户（appid 无效）',
  '54000': '必填参数为空',
  '54001': '签名错误，请检查 APP ID 和密钥是否正确',
  '54003': '访问频率受限',
  '54004': '账户余额不足',
  '54005': '长 query 请求频繁',
  '58000': '客户端 IP 非法',
  '58001': '译文语言方向不支持',
  '58002': '服务当前已关闭',
  '58003': '此 IP 已被封禁',
  '90107': '认证未通过或未生效'
};

function getBaiduErrorMsg(code) {
  return BAIDU_ERROR_MAP[code] ? `${BAIDU_ERROR_MAP[code]} (错误码: ${code})` : `百度翻译失败 (错误码: ${code || '未知'})`;
}

// 百度翻译 - 通用版
async function translateByBaidu(text, settings) {
  if (!settings.baiduAppId || !settings.baiduAppKey) {
    return { success: false, error: '请先在设置中配置百度翻译 APP ID 和密钥' };
  }
  
  const salt = Math.round(Date.now() / 1000) + '' + Math.floor(Math.random() * 10);
  const sign = md5(settings.baiduAppId + text + salt + settings.baiduAppKey);
  
  const langMap = {
    'zh-CN': 'zh', 'zh-TW': 'cht', 'en': 'en', 'ja': 'jp', 'ko': 'kor',
    'fr': 'fra', 'de': 'de', 'es': 'spa', 'ru': 'ru', 'it': 'it',
    'pt': 'pt', 'ar': 'ara'
  };
  const targetLang = langMap[settings.targetLang] || 'zh';
  
  try {
    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=${targetLang}&appid=${settings.baiduAppId}&salt=${salt}&sign=${sign}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { success: false, error: `百度 HTTP ${response.status}` };
    }
    
    const data = await response.json();
    if (data.trans_result && data.trans_result[0]) {
      return { success: true, result: data.trans_result.map(item => item.dst).join('\n') };
    }
    return { success: false, error: data.error_msg || getBaiduErrorMsg(data.error_code) };
  } catch (error) {
    return { success: false, error: `百度翻译错误: ${error.message}` };
  }
}

// 百度翻译 - 大模型版
// 参考文档: https://fanyi-api.baidu.com/doc/21
async function translateByBaiduLLM(text, settings) {
  if (!settings.baiduAppId || !settings.baiduAppKey) {
    return { success: false, error: '请先在设置中配置百度翻译 APP ID 和密钥' };
  }
  
  const salt = Math.round(Date.now() / 1000) + '' + Math.floor(Math.random() * 10);
  // 大模型翻译签名规则与通用版相同：md5(appid + q + salt + secretKey)
  const sign = md5(settings.baiduAppId + text + salt + settings.baiduAppKey);
  
  // 大模型版语言代码与通用版略有差异
  const langMap = {
    'zh-CN': 'zh', 'zh-TW': 'cht', 'en': 'en', 'ja': 'jp', 'ko': 'kor',
    'fr': 'fra', 'de': 'de', 'es': 'spa', 'ru': 'ru', 'it': 'it',
    'pt': 'pt', 'ar': 'ara'
  };
  const targetLang = langMap[settings.targetLang] || 'zh';
  
  try {
    // 大模型翻译接口端点
    const url = 'https://fanyi-api.baidu.com/api/trans/v1/translate';
    
    const params = new URLSearchParams();
    params.append('q', text);
    params.append('from', 'auto');
    params.append('to', targetLang);
    params.append('appid', settings.baiduAppId);
    params.append('salt', salt);
    params.append('sign', sign);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    if (!response.ok) {
      return { success: false, error: `百度大模型 HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    // 兼容多种返回结构
    if (data.trans_result && data.trans_result.length > 0) {
      return { success: true, result: data.trans_result.map(item => item.dst).join('\n') };
    }
    if (data.data && data.data.length > 0) {
      return { success: true, result: data.data.map(item => item.dst || item.text).join('\n') };
    }
    if (data.result) {
      return { success: true, result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result) };
    }
    
    return { success: false, error: data.error_msg || getBaiduErrorMsg(data.error_code) };
  } catch (error) {
    return { success: false, error: `百度大模型翻译错误: ${error.message}` };
  }
}

// 腾讯翻译 - 使用 TC3-HMAC-SHA256 签名
// 参考文档: https://cloud.tencent.com/document/api/551/15619
async function translateByTencent(text, settings) {
  if (!settings.tencentSecretId || !settings.tencentSecretKey) {
    return { success: false, error: '请先在设置中配置腾讯云 SecretId 和 SecretKey' };
  }
  
  // 语言代码转换 - 腾讯云支持的目标语言
  const langMap = {
    'zh-CN': 'zh', 'zh-TW': 'zh-TW', 'en': 'en', 'ja': 'ja',
    'ko': 'ko', 'fr': 'fr', 'de': 'de', 'es': 'es', 'ru': 'ru',
    'it': 'it', 'pt': 'pt', 'ar': 'ar'
  };
  const target = langMap[settings.targetLang] || 'zh';
  
  // 腾讯云 API 配置
  const SECRET_ID = settings.tencentSecretId;
  const SECRET_KEY = settings.tencentSecretKey;
  const region = settings.tencentRegion || 'ap-beijing';
  const host = 'tmt.tencentcloudapi.com';
  const service = 'tmt';
  const action = 'TextTranslate';
  const version = '2018-03-21';
  const endpoint = `https://${host}`;
  
  // 请求参数
  const payload = JSON.stringify({
    SourceText: text,
    Source: 'auto',
    Target: target,
    ProjectId: 0
  });
  
  // 时间戳（秒）
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().substr(0, 10); // YYYY-MM-DD UTC
  
  try {
    // ********** 步骤 1：拼接规范请求串 **********
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = 'content-type;host;x-tc-action';
    const hashedRequestPayload = await sha256Hex(payload);
    
    const canonicalRequest = httpRequestMethod + '\n' +
      canonicalUri + '\n' +
      canonicalQueryString + '\n' +
      canonicalHeaders + '\n' +
      signedHeaders + '\n' +
      hashedRequestPayload;
    
    // ********** 步骤 2：拼接待签名字符串 **********
    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
    
    const stringToSign = algorithm + '\n' +
      timestamp + '\n' +
      credentialScope + '\n' +
      hashedCanonicalRequest;
    
    // ********** 步骤 3：计算签名 **********
    const secretDate = await hmacSha256('TC3' + SECRET_KEY, date);
    const secretService = await hmacSha256(secretDate, service);
    const secretSigning = await hmacSha256(secretService, 'tc3_request');
    const signature = await hmacSha256Hex(secretSigning, stringToSign);
    
    // ********** 步骤 4：拼接 Authorization **********
    const authorization = algorithm + ' ' +
      'Credential=' + SECRET_ID + '/' + credentialScope + ', ' +
      'SignedHeaders=' + signedHeaders + ', ' +
      'Signature=' + signature;
    
    // ********** 步骤 5：发起 HTTP 请求 **********
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Version': version,
        'X-TC-Region': region
      },
      body: payload
    });
    
    if (!response.ok) {
      return { success: false, error: `腾讯云 HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (data.Response) {
      if (data.Response.Error) {
        return { 
          success: false, 
          error: `${data.Response.Error.Message} (错误码: ${data.Response.Error.Code})` 
        };
      }
      if (data.Response.TargetText) {
        return { success: true, result: data.Response.TargetText };
      }
    }
    
    return { success: false, error: '腾讯翻译返回结果为空' };
  } catch (error) {
    return { success: false, error: `腾讯翻译错误: ${error.message}` };
  }
}

// 计算字符数（按 Unicode 码点，与百度/腾讯计费规则一致）
function countChars(text) {
  if (!text) return 0;
  // 使用 Array.from 确保对 emoji 等 surrogate pair 正确计数为单个字符
  return Array.from(text).length;
}

// 获取当前月份键 YYYY-MM
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 累加用量统计
async function addUsage(engine, chars) {
  if (!engine || !chars) return;
  const month = getCurrentMonth();
  return new Promise((resolve) => {
    chrome.storage.local.get({ usage: {} }, (data) => {
      const usage = data.usage || {};
      if (!usage[engine]) usage[engine] = {};
      usage[engine][month] = (usage[engine][month] || 0) + chars;
      chrome.storage.local.set({ usage }, resolve);
    });
  });
}

// 自定义 LLM 翻译 (OpenAI 兼容格式)
async function translateByCustomLlm(text, settings, customLlmList) {
  const index = parseInt(settings.selectedLlmIndex);
  if (isNaN(index) || !customLlmList || index < 0 || index >= customLlmList.length) {
    return { success: false, error: '请先在设置中添加并选择一个大模型' };
  }
  
  const llm = customLlmList[index];
  const baseUrl = llm.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  
  // 构建翻译 prompt
  const langNames = {
    'zh-CN': '简体中文', 'zh-TW': '繁体中文', 'en': '英语', 'ja': '日语',
    'ko': '韩语', 'fr': '法语', 'de': '德语', 'es': '西班牙语', 'ru': '俄语',
    'it': '意大利语', 'pt': '葡萄牙语', 'ar': '阿拉伯语'
  };
  const targetLangName = langNames[settings.targetLang] || settings.targetLang;
  
  const systemPrompt = `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLangName}。只返回翻译结果，不要添加任何解释、引号或额外内容。`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.apiKey}`
      },
      body: JSON.stringify({
        model: llm.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });
    
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error && errData.error.message) {
          errorMsg = errData.error.message;
        }
      } catch (e) {}
      return { success: false, error: `大模型 API 错误: ${errorMsg}` };
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const result = data.choices[0].message.content.trim();
      return { success: true, result };
    }
    
    return { success: false, error: '大模型返回结果为空' };
  } catch (error) {
    return { success: false, error: `大模型请求失败: ${error.message}` };
  }
}

// 统一翻译入口
async function translate(text, settings) {
  let result;
  
  if (settings.translateEngine === 'custom_llm') {
    // 获取自定义 LLM 列表
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get({ customLlmList: [] }, resolve);
    });
    result = await translateByCustomLlm(text, settings, data.customLlmList);
  } else {
    switch (settings.translateEngine) {
      case 'google':
        result = await translateByGoogle(text, settings);
        break;
      case 'baidu':
        result = await translateByBaidu(text, settings);
        break;
      case 'baidu_llm':
        result = await translateByBaiduLLM(text, settings);
        break;
      case 'tencent':
        result = await translateByTencent(text, settings);
        break;
      default:
        result = await translateByGoogle(text, settings);
    }
  }
  
  // 翻译成功后累加用量统计（仅统计计费引擎）
  if (result && result.success && ['baidu', 'baidu_llm', 'tencent'].includes(settings.translateEngine)) {
    addUsage(settings.translateEngine, countChars(text));
  }
  
  return result;
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translate') {
    translate(message.text, message.settings).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: `异常: ${error.message}` });
    });
    return true; // 异步响应
  }
});
