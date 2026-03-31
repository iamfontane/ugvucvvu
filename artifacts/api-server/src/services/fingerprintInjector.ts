/**
 * Fingerprint Injector
 * Injects JS overrides into every page to spoof browser fingerprints and
 * prevent detection via canvas, WebGL, audio, fonts, hardware, and WebRTC.
 */

import type { Page } from "puppeteer-core";
import type { BrowserFingerprint } from "./fingerprintGenerator.js";

export async function injectFingerprint(page: Page, fp: BrowserFingerprint): Promise<void> {
  await page.evaluateOnNewDocument(buildInjectionScript(fp));
}

function buildInjectionScript(fp: BrowserFingerprint): string {
  return `
(function() {
  'use strict';

  // ─── Navigator overrides ─────────────────────────────────────────────────
  const _nav = navigator;

  function overrideProp(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        configurable: true,
        enumerable: true,
      });
    } catch(e) {}
  }

  overrideProp(_nav, 'platform', ${JSON.stringify(fp.platform)});
  overrideProp(_nav, 'vendor', ${JSON.stringify(fp.vendor)});
  overrideProp(_nav, 'language', ${JSON.stringify(fp.language)});
  overrideProp(_nav, 'languages', ${JSON.stringify(fp.languages)});
  overrideProp(_nav, 'hardwareConcurrency', ${fp.cpuCores});
  overrideProp(_nav, 'deviceMemory', ${fp.deviceMemory});
  overrideProp(_nav, 'maxTouchPoints', ${fp.touchPoints});

  // User agent
  overrideProp(_nav, 'userAgent', ${JSON.stringify(fp.userAgent)});

  // User agent data (new API)
  if (_nav.userAgentData) {
    const brands = ${JSON.stringify(buildBrands(fp))};
    const uad = {
      brands,
      mobile: false,
      platform: ${JSON.stringify(fp.os === 'windows' ? 'Windows' : fp.os === 'mac' ? 'macOS' : 'Linux')},
      getHighEntropyValues: async (hints) => ({
        brands,
        mobile: false,
        platform: ${JSON.stringify(fp.os === 'windows' ? 'Windows' : fp.os === 'mac' ? 'macOS' : 'Linux')},
        platformVersion: ${JSON.stringify(fp.osVersion)},
        architecture: 'x86',
        bitness: '64',
        model: '',
        uaFullVersion: ${JSON.stringify(fp.browserVersion)},
        fullVersionList: brands,
      }),
      toJSON: () => ({ brands, mobile: false, platform: ${JSON.stringify(fp.os)} }),
    };
    try {
      Object.defineProperty(_nav, 'userAgentData', { get: () => uad, configurable: true });
    } catch(e) {}
  }

  // ─── Screen overrides ────────────────────────────────────────────────────
  overrideProp(screen, 'width', ${fp.screenWidth});
  overrideProp(screen, 'height', ${fp.screenHeight});
  overrideProp(screen, 'availWidth', ${fp.screenWidth});
  overrideProp(screen, 'availHeight', ${fp.screenHeight - 40});
  overrideProp(screen, 'colorDepth', ${fp.colorDepth});
  overrideProp(screen, 'pixelDepth', ${fp.colorDepth});
  overrideProp(window, 'devicePixelRatio', ${fp.pixelRatio});

  // ─── Canvas fingerprint noise ────────────────────────────────────────────
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      const noise = ${fp.canvasNoiseSeed};
      for (let i = 0; i < data.length; i += 4) {
        data[i]   = Math.max(0, Math.min(255, data[i]   + (noise % 3) - 1));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + ((noise + 1) % 3) - 1));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + ((noise + 2) % 3) - 1));
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.apply(this, args);
  };

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = origGetImageData.apply(this, args);
    const noise = ${fp.canvasNoiseSeed};
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i]   = Math.max(0, Math.min(255, imageData.data[i]   + (noise % 2)));
      imageData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] + ((noise+1) % 2)));
    }
    return imageData;
  };

  // ─── WebGL fingerprint ───────────────────────────────────────────────────
  const getParamOrig = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return ${JSON.stringify(fp.webglVendor)};   // UNMASKED_VENDOR_WEBGL
    if (param === 37446) return ${JSON.stringify(fp.webglRenderer)}; // UNMASKED_RENDERER_WEBGL
    if (param === 7936)  return 'WebKit';  // VENDOR
    if (param === 7937)  return 'WebKit WebGL'; // RENDERER
    return getParamOrig.apply(this, arguments);
  };

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParam2Orig = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return ${JSON.stringify(fp.webglVendor)};
      if (param === 37446) return ${JSON.stringify(fp.webglRenderer)};
      if (param === 7936)  return 'WebKit';
      if (param === 7937)  return 'WebKit WebGL';
      return getParam2Orig.apply(this, arguments);
    };
  }

  // ─── Audio fingerprint noise ─────────────────────────────────────────────
  const origGetChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(channel) {
    const data = origGetChannelData.apply(this, [channel]);
    const noise = ${fp.audioNoiseSeed} * 0.0001;
    for (let i = 0; i < data.length; i += 100) {
      data[i] += noise;
    }
    return data;
  };

  const AudioCtxOrig = window.AudioContext || window.webkitAudioContext;
  if (AudioCtxOrig) {
    const origCreateAnalyser = AudioCtxOrig.prototype.createAnalyser;
    AudioCtxOrig.prototype.createAnalyser = function() {
      const analyser = origCreateAnalyser.apply(this, arguments);
      const origGetFloat = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function(array) {
        origGetFloat.apply(this, [array]);
        const noise = ${fp.audioNoiseSeed} * 0.001;
        for (let i = 0; i < array.length; i++) {
          array[i] += noise * (Math.random() - 0.5) * 2;
        }
      };
      return analyser;
    };
  }

  // ─── WebRTC leak prevention ──────────────────────────────────────────────
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function(constraints) {
      if (constraints && constraints.video === undefined && constraints.audio) {
        throw new DOMException('Permission denied', 'NotAllowedError');
      }
      return origGetUserMedia(constraints);
    };
  }

  // RTCPeerConnection — block ICE candidates that reveal real IP
  const OrigRTCPeerConnection = window.RTCPeerConnection;
  if (OrigRTCPeerConnection) {
    window.RTCPeerConnection = function(config, ...rest) {
      if (config && config.iceServers) {
        config.iceTransportPolicy = 'relay';
      }
      const pc = new OrigRTCPeerConnection(config, ...rest);
      const origAddICE = pc.onicecandidate;
      Object.defineProperty(pc, 'onicecandidate', {
        set(fn) {
          origAddICE && (pc._iceHandler = fn);
          Object.getOwnPropertyDescriptor(OrigRTCPeerConnection.prototype, 'onicecandidate').set.call(pc, function(e) {
            if (e.candidate && e.candidate.candidate && e.candidate.candidate.includes('host')) return;
            fn && fn.call(pc, e);
          });
        },
        get() { return origAddICE; },
        configurable: true,
      });
      return pc;
    };
    Object.setPrototypeOf(window.RTCPeerConnection, OrigRTCPeerConnection);
    window.RTCPeerConnection.prototype = OrigRTCPeerConnection.prototype;
  }

  // ─── Timezone spoof ──────────────────────────────────────────────────────
  // (Timezone is set at the browser level via Puppeteer's emulateTimezone — see browserLauncher)

  // ─── Network Information ─────────────────────────────────────────────────
  if ('connection' in navigator) {
    const conn = navigator.connection;
    if (conn) {
      overrideProp(conn, 'type', ${JSON.stringify(fp.connectionType)});
      overrideProp(conn, 'effectiveType', '4g');
      overrideProp(conn, 'rtt', ${fp.connectionRtt});
      overrideProp(conn, 'downlink', ${fp.connectionDownlink});
      overrideProp(conn, 'saveData', false);
    }
  }

  // ─── Font detection prevention ───────────────────────────────────────────
  const allowedFonts = new Set(${JSON.stringify(fp.fonts)});
  const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const result = origMeasureText.apply(this, [text]);
    const fontStr = (this.font || '').toLowerCase();
    const isAllowed = Array.from(allowedFonts).some(f => fontStr.includes(f.toLowerCase()));
    if (!isAllowed && fontStr.includes('px') && text.length < 5) {
      Object.defineProperty(result, 'width', { value: result.width + 0.0001 });
    }
    return result;
  };

  // ─── Permission API spoof ────────────────────────────────────────────────
  if (navigator.permissions) {
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = async function(desc) {
      if (desc && desc.name === 'notifications') {
        return { state: 'denied', onchange: null };
      }
      return origQuery(desc);
    };
  }

  // ─── Battery API spoof ───────────────────────────────────────────────────
  if (navigator.getBattery) {
    navigator.getBattery = async function() {
      return {
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 0.85 + Math.random() * 0.1,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
    };
  }

})();
`;
}

function buildBrands(fp: BrowserFingerprint): Array<{ brand: string; version: string }> {
  const major = fp.browserVersion.split(".")[0] ?? "121";
  if (fp.browser === "chrome") {
    return [
      { brand: "Not_A Brand", version: "8" },
      { brand: "Chromium", version: major },
      { brand: "Google Chrome", version: major },
    ];
  }
  if (fp.browser === "firefox") {
    return [{ brand: "Firefox", version: major }];
  }
  return [{ brand: "Safari", version: fp.browserVersion }];
}
