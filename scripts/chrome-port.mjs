import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe")] : []),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);

  const winPlaywright = join(homedir(), "AppData/Local/ms-playwright");
  if (existsSync(winPlaywright)) {
    for (const dir of readdirSync(winPlaywright).sort().reverse()) {
      for (const sub of ["chrome-win/chrome.exe", "chromium-win64/chrome.exe"]) {
        candidates.push(join(winPlaywright, dir, sub));
      }
    }
  }
  const macPlaywright = join(homedir(), "Library/Caches/ms-playwright");
  if (existsSync(macPlaywright)) {
    for (const dir of readdirSync(macPlaywright).sort().reverse()) {
      for (const sub of [
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium"
      ]) {
        candidates.push(join(macPlaywright, dir, sub));
      }
    }
  }
  const linuxPlaywright = join(homedir(), ".cache/ms-playwright");
  if (existsSync(linuxPlaywright)) {
    for (const dir of readdirSync(linuxPlaywright).sort().reverse()) {
      for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) {
        candidates.push(join(linuxPlaywright, dir, sub));
      }
    }
  }

  return candidates.find((p) => existsSync(p));
}

export async function chromePort(chrome, profile) {
  try {
    return await new Promise((done, fail) => {
      let text = "";
      const clean = () => {
        clearTimeout(timer);
        chrome.stderr.off("data", data);
        chrome.off("error", error);
        chrome.off("exit", exited);
      };
      const error = (cause) => {
        clean();
        fail(cause);
      };
      const exited = (code, signal) => error(new Error(`Chrome exited before startup: ${code ?? signal}`));
      const data = (chunk) => {
        text += chunk;
        const match = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
        if (match) {
          clean();
          done(Number(match[1]));
        }
      };
      const timer = setTimeout(() => error(new Error("Chrome did not start within 20s")), 20000);
      chrome.stderr.on("data", data);
      chrome.on("error", error);
      chrome.on("exit", exited);
    });
  } catch (error) {
    chrome.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
    throw error;
  }
}

export async function withHeadlessPage(targetPathOrUrl, opts, callback) {
  const { width = 1440, height = 960, scale = 2 } = opts || {};
  const url = /^https?:|^file:/.test(targetPathOrUrl)
    ? targetPathOrUrl
    : pathToFileURL(resolve(targetPathOrUrl)).href;

  const binary = findChromeBinary();
  if (!binary) {
    throw new Error("No Chrome/Edge/Chromium binary found. Set CHROME_PATH.");
  }

  const profile = mkdtempSync(join(tmpdir(), "anatomy3d-"));
  const chrome = spawn(binary, [
    "--headless=new",
    ...(process.platform === "linux" ? ["--no-sandbox"] : []),
    ...(process.platform === "win32" ? ["--do-not-de-elevate"] : []),
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "about:blank"
  ]);

  const port = await chromePort(chrome, profile);
  let socket = null;

  const cleanup = () => {
    try {
      if (socket) socket.close();
    } catch {}
    try {
      chrome.kill("SIGKILL");
    } catch {}
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  };

  try {
    const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    socket = new WebSocket(page.webSocketDebuggerUrl);
    let callId = 0;
    const pending = new Map();
    const problems = [];
    let loaded = () => {};

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.method === "Page.loadEventFired") loaded();
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      } else if (
        data.method === "Runtime.consoleAPICalled" &&
        (data.params.type === "error" || data.params.type === "warning")
      ) {
        problems.push(
          `console.${data.params.type}: ${data.params.args
            .map((a) => a.value ?? a.description ?? "")
            .join(" ")
            .slice(0, 500)}`
        );
      } else if (data.method === "Runtime.exceptionThrown") {
        const detail = data.params.exceptionDetails;
        problems.push(`exception: ${detail.exception?.description ?? detail.text}`.slice(0, 500));
      }
    };

    await new Promise((done) => (socket.onopen = done));

    const send = (method, params = {}, patience = 60000) =>
      new Promise((done, fail) => {
        const id = ++callId;
        const timer = setTimeout(() => {
          pending.delete(id);
          fail(new Error(`Chrome did not answer ${method} within ${Math.round(patience / 1000)}s`));
        }, patience);
        pending.set(id, (data) => {
          clearTimeout(timer);
          done(data);
        });
        socket.send(JSON.stringify({ id, method, params }));
      });

    const evaluate = async (expression) => {
      const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (reply.error) throw new Error(reply.error.message);
      const ex = reply.result?.exceptionDetails;
      if (ex) throw new Error(ex.exception?.description ?? ex.text);
      return reply.result?.result?.value;
    };

    const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: width < 600
    });

    const loadPromise = new Promise((done) => {
      loaded = done;
      setTimeout(done, 12000);
    });
    const nav = await send("Page.navigate", { url });
    if (nav.error) throw new Error(`Navigation failed: ${nav.error.message}`);
    await loadPromise;
    await sleep(600);

    const getElementBox = async (selector = "#figure-card") => {
      const box = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)}) || document.body;
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
      })()`);
      return box;
    };

    const captureBase64 = async (selector = "#figure-card", crop = null, clipScale = 1) => {
      const box = await getElementBox(selector);
      const clip = crop
        ? {
            x: box.x + crop.x,
            y: box.y + crop.y,
            width: crop.width,
            height: crop.height,
            scale: clipScale
          }
        : {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            scale: clipScale
          };
      const shot = await send("Page.captureScreenshot", {
        format: "png",
        clip,
        captureBeyondViewport: true
      });
      return shot.result.data;
    };

    const saveBase64Png = (outPath, base64Data) => {
      const resolved = resolve(outPath);
      mkdirSync(dirname(resolved), { recursive: true });
      writeFileSync(resolved, Buffer.from(base64Data, "base64"));
      return resolved;
    };

    const tileImages = async (tiles, cols = 2, opts = {}) => {
      const { crosshair = false } = opts;
      return await evaluate(`(async () => {
        const tiles = ${JSON.stringify(tiles)};
        const cols = ${cols};
        const crosshair = ${Boolean(crosshair)};
        const loadedImgs = await Promise.all(tiles.map(t => new Promise(res => {
          const img = new Image();
          img.onload = () => res({ img, label: t.label, sublabel: t.sublabel || "" });
          img.src = "data:image/png;base64," + t.base64;
        })));
        const pad = 12;
        const headerH = 34;
        const cellW = loadedImgs[0].img.width;
        const cellH = loadedImgs[0].img.height + headerH;
        const rows = Math.ceil(loadedImgs.length / cols);
        const canvas = document.createElement("canvas");
        canvas.width = cols * cellW + (cols + 1) * pad;
        canvas.height = rows * cellH + (rows + 1) * pad;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#181715";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        loadedImgs.forEach((item, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = pad + col * (cellW + pad);
          const y = pad + row * (cellH + pad);

          ctx.fillStyle = "#252320";
          ctx.fillRect(x, y, cellW, cellH);

          ctx.fillStyle = "#f3f2ee";
          ctx.font = "bold 14px ui-monospace, Menlo, Consolas, monospace";
          ctx.fillText(item.label, x + 10, y + 22);

          if (item.sublabel) {
            ctx.fillStyle = "#a8a29e";
            ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
            const m = ctx.measureText(item.sublabel);
            ctx.fillText(item.sublabel, x + cellW - m.width - 10, y + 22);
          }

          const imgY = y + headerH;
          ctx.drawImage(item.img, x, imgY);

          if (crosshair) {
            const cx = x + cellW * 0.5;
            const cy = imgY + item.img.height * 0.5;
            ctx.strokeStyle = "rgba(217, 119, 6, 0.85)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 26, cy);
            ctx.lineTo(cx - 10, cy);
            ctx.moveTo(cx + 10, cy);
            ctx.lineTo(cx + 26, cy);
            ctx.moveTo(cx, cy - 26);
            ctx.lineTo(cx, cy - 10);
            ctx.moveTo(cx, cy + 10);
            ctx.lineTo(cx, cy + 26);
            ctx.stroke();
          }
        });
        return canvas.toDataURL("image/png").split(",")[1];
      })()`);
    };

    const result = await callback({
      send,
      evaluate,
      sleep,
      getElementBox,
      captureBase64,
      saveBase64Png,
      tileImages,
      problems
    });

    cleanup();
    return result;
  } catch (err) {
    cleanup();
    throw err;
  }
}
