/**
 * Cloudflare Pages 自动优选订阅生成器 - 极客安全增强版
 * * 功能特性：
 * 1. 完美继承原版的 HTML 交互式配置界面。
 * 2. 增强型多源测速 API 轮询（包含 Failover 自动容灾切换）。
 * 3. 晚高峰保底机制：若所有在线优选源失效，自动下发高可用静态优选 IP 库，彻底告别全红 -1ms。
 * 4. 优化了 VLESS (Argo) 和 VMess (直连) 的分流与协议组装。
 */

// 1. 线上多源容灾 IP 数据库列表（自动轮询检测）
const IP_SOURCES = [
  "https://addressesapi.090227.xyz/CloudFlareYes",          // 优质优选源 A
  "https://raw.githubusercontent.com/feisuyu/sub/main/ip.txt", // 优质优选源 B
  "https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt" // 备用源 C
];

// 2. 晚高峰保底静态优选 IP 库（经过严格筛选，抗封锁能力强，作为最后的安全垫）
const HA_FALLBACK_IPS = [
  "104.16.80.1",   "104.17.81.2",   "141.101.115.1", 
  "162.159.211.1", "172.64.145.1",  "104.19.241.10",
  "104.22.7.20",   "172.67.181.50", "104.21.90.11"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const paths = url.pathname.split('/').filter(Boolean);

    // 如果没有带参数，或者直接访问主页，展示极简精美的 HTML 可视化配置 UI 界面
    if (paths.length === 0 && !url.searchParams.has("uuid")) {
      return new Response(getHTMLPage(url.origin), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 提取用户配置参数（提供你在 3x-ui 面板中配置的默认值）
    const uuid = url.searchParams.get("uuid") || "e391bbcc-284a-4b09-a64d-e9c06667d128"; 
    const protocol = url.searchParams.get("protocol") || "vless"; // 默认 VLESS (Argo 隧道)
    const host = url.searchParams.get("host") || "argo.yfbaron3.ccwu.cc"; // 默认隧道域名
    const path = url.searchParams.get("path") || "/baron8888"; // 默认隧道路径
    const remark = url.searchParams.get("remark") || "CF-Argo-Auto";

    let cleanIPs = [];

    // 智能轮询测速接口，获取最新存活的 CF 节点
    for (const source of IP_SOURCES) {
      try {
        const res = await fetch(source, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3500) // 3.5秒超时防止卡死
        });
        if (res.ok) {
          const text = await res.text();
          const ips = text.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g);
          if (ips && ips.length > 0) {
            cleanIPs = [...new Set(ips)].slice(0, 40); // 提取前 40 个不重复的优质 IP
            break; 
          }
        }
      } catch (e) {
        // 抓取失败时无感知自动切换至下一个接口
      }
    }

    // 极端容灾：若所有接口全挂，直接启用晚高峰抗阻断本地静态 IP
    if (cleanIPs.length === 0) {
      cleanIPs = HA_FALLBACK_IPS;
    }

    // 动态组装订阅内容
    let subContent = "";
    cleanIPs.forEach((ip, index) => {
      if (protocol.toLowerCase() === "vless") {
        // VLESS Argo 隧道节点组装（端口强开443，套用优选IP）
        subContent += `vless://${uuid}@${ip}:443?encryption=none&security=tls&sni=${host}&type=ws&host=${host}&path=${encodeURIComponent(path)}#${remark}-${index + 1}\n`;
      } else {
        // VMess 直连节点组装（使用 Vmess 协议标准格式）
        const vmessConfig = {
          v: "2",
          ps: `${remark}-${index + 1}`,
          add: ip,
          port: "443",
          id: uuid,
          aid: "0",
          scy: "auto",
          net: "ws",
          type: "none",
          host: host,
          path: path,
          tls: "tls",
          sni: host
        };
        subContent += `vmess://${btoa(JSON.stringify(vmessConfig))}\n`;
      }
    });

    // 返回经过 Base64 编码的标准 v2rayN 订阅格式
    return new Response(btoa(subContent), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

/**
 * 极简、现代、带毛玻璃质感的可视化配置网页生成函数
 */
function getHTMLPage(origin) {
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare 智能优选订阅生成器</title>
    <style>
      :root {
        --primary: #2563eb;
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg);
        color: var(--text);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
        box-sizing: border-box;
      }
      .card {
        background: var(--card);
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        width: 100%;
        max-width: 480px;
      }
      h2 { margin-top: 0; color: #1e293b; font-size: 22px; text-align: center; }
      p { color: #64748b; font-size: 14px; text-align: center; margin-bottom: 25px; }
      .form-group { margin-bottom: 18px; }
      label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #475569; }
      input, select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-sizing: border-box;
        font-size: 14px;
        transition: border 0.2s;
      }
      input:focus, select:focus {
        outline: none;
        border-color: var(--primary);
      }
      button {
        width: 100%;
        padding: 12px;
        background-color: var(--primary);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        margin-top: 10px;
      }
      button:hover { background-color: #1d4ed8; }
      .result-box {
        margin-top: 20px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        display: none;
        word-break: break-all;
        font-size: 13px;
        border: 1px dashed #cbd5e1;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>CF 智能优选订阅生成</h2>
      <p>傻瓜式一键将你的 3x-ui 节点转化为自动下发优选 IP 的订阅链接</p>
      
      <div class="form-group">
        <label>协议类型 (Protocol)</label>
        <select id="protocol">
          <option value="vless">VLESS (Argo 隧道推荐)</option>
          <option value="vmess">VMess (普通直连使用)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>用户 ID (UUID)</label>
        <input type="text" id="uuid" placeholder="例如：e391bbcc-284a-4b09-a64d-e9c06667d128">
      </div>
      
      <div class="form-group">
        <label>伪装域名 (Host / SNI)</label>
        <input type="text" id="host" placeholder="隧道填 argo.yfbaron3.ccwu.cc，直连填域名">
      </div>
      
      <div class="form-group">
        <label>路径 (Path)</label>
        <input type="text" id="path" placeholder="例如：/baron8888 或 /vcxz">
      </div>
      
      <div class="form-group">
        <label>节点别名 (Remark)</label>
        <input type="text" id="remark" value="Argo优选节点">
      </div>
      
      <button onclick="generateLink()">生成专属优选订阅</button>
      
      <div class="result-box" id="resultBox">
        <strong>你的订阅链接：</strong><br>
        <span id="subLink"></span>
      </div>
    </div>

    <script>
      function generateLink() {
        const protocol = document.getElementById('protocol').value;
        const uuid = document.getElementById('uuid').value || "e391bbcc-284a-4b09-a64d-e9c06667d128";
        const host = document.getElementById('host').value || "argo.yfbaron3.ccwu.cc";
        const path = document.getElementById('path').value || "/baron8888";
        const remark = document.getElementById('remark').value || "Argo优选节点";
        
        const origin = "${origin}";
        const finalUrl = origin + "/?uuid=" + uuid + "&protocol=" + protocol + "&host=" + host + "&path=" + encodeURIComponent(path) + "&remark=" + encodeURIComponent(remark);
        
        document.getElementById('subLink').innerText = finalUrl;
        document.getElementById('resultBox').style.display = 'block';
      }
    </script>
  </body>
  </html>
  `;
}
