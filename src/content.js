function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function createButton() {
    if (document.getElementById('mj-notion-save-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'mj-notion-save-btn';
    btn.textContent = 'Save to Notion';
    btn.dataset.state = 'idle';
    btn.style.position = 'fixed';
    btn.style.bottom = '30px';
    btn.style.right = '30px';
    btn.style.zIndex = '2147483647';
    btn.style.padding = '12px 24px';
    btn.style.backgroundColor = '#1a1a1a';
    btn.style.color = '#ffffff';
    btn.style.border = '1px solid #333';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    btn.style.fontFamily = 'system-ui, sans-serif';
    btn.style.fontWeight = '600';
    btn.style.transition = 'all 0.2s ease';

    btn.onmouseover = () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.backgroundColor = getButtonBackground(btn.dataset.state, true);
    };
    btn.onmouseout = () => {
        btn.style.transform = 'translateY(0)';
        btn.style.backgroundColor = getButtonBackground(btn.dataset.state);
    };

    btn.onclick = handleSave;

    document.body.appendChild(btn);
}

function getButtonBackground(state, hovered = false) {
    const colors = {
        idle: hovered ? '#333333' : '#1a1a1a',
        loading: hovered ? '#333333' : '#1a1a1a',
        success: hovered ? '#236b23' : '#2d862d',
        error: hovered ? '#a30000' : '#cc0000'
    };

    return colors[state] || colors.idle;
}

function setButtonState(btn, text, state, disabled) {
    btn.textContent = text;
    btn.dataset.state = state;
    btn.disabled = disabled;
    btn.style.backgroundColor = getButtonBackground(state);
}

const IMAGE_SOURCE_HOSTS = [
    'cdn.midjourney.com',
    'cdn.nijijourney.com'
];

function isSupportedImageUrl(url) {
    if (!url) return false;

    const decodedUrl = safeDecodeUrl(url);
    return IMAGE_SOURCE_HOSTS.some(host => decodedUrl.includes(host));
}

function getBestImage() {
    const images = Array.from(document.querySelectorAll('img'));

    const candidates = images.filter(img => {
        return isSupportedImageUrl(img.src) || isSupportedImageUrl(img.currentSrc);
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        const areaA = (a.naturalWidth || a.width) * (a.naturalHeight || a.height);
        const areaB = (b.naturalWidth || b.width) * (b.naturalHeight || b.height);
        return areaB - areaA;
    });

    return candidates[0];
}

function getBestPrompt(rootElement = document.body) {
    const lightbox = document.getElementById('lightboxPrompt');
    if (lightbox) {
        const text = lightbox.querySelector('.notranslate');
        if (!text) return null;
        const prompt = text.innerText.trim();
        const parameters = Array.from(lightbox.querySelectorAll('button span'))
            .map(span => span.textContent.trim())
            .filter(value => /^--[a-z][a-z0-9-]*(?:\s|$)/i.test(value));
        return [prompt, ...new Set(parameters)].filter(Boolean).join(' ');
    }
    const fullText = rootElement.innerText || "";
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let mainPrompt = "";
    let capturedParams = [];

    // Explicit parameters retain unknown future keys; bare UI labels require
    // a complete, typed value so prose cannot become a fabricated parameter.
    const numericKeys = 'v|version|niji|c|chaos|s|stylize|w|weird|q|quality|r|repeat|stop|seed|iw|cw|sw|sv|ow|exp|bs';
    const bareNumeric = new RegExp(`^(${numericKeys})\\s+([0-9]+(?:\\.[0-9]+)?)$`, 'i');
    const bareProfile = /^(profile|p|personalize)\s+([a-z0-9]+(?:\s+[a-z0-9]+)*)$/i;
    const bareAspect = /^(ar|aspect)\s+(\d+:\d+)$/i;
    const explicitPattern = /(?:^|\s)--([a-z][a-z0-9-]*)(?=\s|$)/gi;
    const numericKey = new RegExp(`^(?:${numericKeys})$`, 'i');
    const flags = new Set(['raw', 'tile', 'draft', 'hd', 'sd', 'fast', 'relax', 'turbo', 'stealth', 'public', 'loop', 'video']);

    function extractParams(line) {
        const matches = Array.from(line.matchAll(explicitPattern));
        if (!matches.length) {
            const bare = line.match(bareNumeric) || line.match(bareAspect) || line.match(bareProfile);
            return bare ? [`--${bare[1].toLowerCase()} ${bare[2]}`] : [];
        }
        return matches.flatMap((match, index) => {
            const key = match[1].toLowerCase();
            let value = line.slice(match.index + match[0].length,
                index + 1 < matches.length ? matches[index + 1].index : line.length).trim();
            if (flags.has(key)) return [`--${key}`];
            if (numericKey.test(key)) {
                const number = value.match(/^\d+(?:\.\d+)?(?=\s|$)/);
                return number ? [`--${key} ${number[0]}`] : [];
            }
            if (key === 'ar' || key === 'aspect') {
                const ratio = value.match(/^\d+:\d+(?=\s|$)/);
                return ratio ? [`--${key} ${ratio[0]}`] : [];
            }
            return value ? [`--${key} ${value}`] : [`--${key}`];
        });
    }

    lines.forEach(line => {
        if (line.length > mainPrompt.length) {
            const isUI = [
                "Midjourney", "Discord", "Job ID", "Upscale", "Remix", "Vary",
                "Zoom", "Pan", "Web", "Creative", "Standard", "Short", "High",
                "Low", "Medium", "Light", "Dark", "Subtle", "Strong", "Region",
                "Favorite", "Image Weight", "Style Reference", "Style Creator",
                "Copy prompt", "Explore at draft quality and refine with variations."
            ].some(keyword => (line === keyword || (line.includes(keyword) && line.length < 40)));

            const isParamString = line.startsWith('--') || bareNumeric.test(line) || bareAspect.test(line) || bareProfile.test(line);

            if (!isUI && !isParamString) {
                mainPrompt = line;
            }
        }

        for (const param of extractParams(line)) {
            if (!capturedParams.includes(param)) capturedParams.push(param);
        }
    });

    // Parameter chips follow the actual prompt in image details. Prefer that
    // adjacent text over unrelated longer text elsewhere in the page.
    const firstChip = lines.findIndex(line => bareNumeric.test(line) || bareAspect.test(line) || bareProfile.test(line));
    if (firstChip > 0) {
        const preceding = lines[firstChip - 1];
        if (!preceding.startsWith('--') && !/^(Copy prompt|Style Creator|Explore at draft quality and refine with variations\.)$/i.test(preceding)) {
            mainPrompt = preceding;
        }
    }
    if (!mainPrompt) return null;

    const promptOnly = mainPrompt.split(/\s--[a-z]/i)[0].trim();
    return [promptOnly, ...capturedParams].join(' ');
}

function safeDecodeUrl(url) {
    try {
        return decodeURIComponent(url);
    } catch (e) {
        return url;
    }
}

function cleanImageUrl(url) {
    if (!url) return url;

    try {
        const parsedUrl = new URL(url);
        const proxiedUrl = parsedUrl.searchParams.get('url');

        if (proxiedUrl && isSupportedImageUrl(proxiedUrl)) {
            return proxiedUrl;
        }
    } catch (e) {
        return url;
    }

    return url;
}

function splitPromptAndParams(fullString) {
    if (!fullString) return { promptText: "", paramsText: "" };

    const paramIndex = fullString.indexOf(" --");

    if (paramIndex === -1) {
        return { promptText: fullString, paramsText: "" };
    }

    return {
        promptText: fullString.substring(0, paramIndex).trim(),
        paramsText: fullString.substring(paramIndex).trim()
    };
}

function getNotionPageUrl(response) {
    const page = response && response.data;
    if (!page) return null;

    const pageUrl = page.pageUrl
        || page.url
        || page.public_url
        || (page.id ? `https://www.notion.so/${page.id.replace(/-/g, '')}` : null);

    if (!pageUrl) return null;

    try {
        const parsedUrl = new URL(pageUrl);
        const isNotionHost = /(^|\.)notion\.(so|site|com)$/i.test(parsedUrl.hostname);
        return parsedUrl.protocol === 'https:' && isNotionHost ? parsedUrl.href : null;
    } catch (e) {
        return null;
    }
}

function handleSave() {
    const btn = document.getElementById('mj-notion-save-btn');
    const originalText = 'Save to Notion';
    const savedPageUrl = btn.dataset.notionPageUrl;

    if (savedPageUrl) {
        window.open(savedPageUrl, '_blank', 'noopener,noreferrer');
        resetBtn(btn, originalText);
        return;
    }

    if (btn.disabled) return;

    setButtonState(btn, '提取中...', 'loading', true);

    const bestImg = getBestImage();
    if (!bestImg) {
        alert('未找到有效图片 (No Image Found)。请先点击图片进入大图/灯箱模式。');
        setButtonState(btn, '无图片', 'error', true);
        setTimeout(() => resetBtn(btn, originalText), 2000);
        return;
    }

    const imageUrl = cleanImageUrl(bestImg.src || bestImg.currentSrc);

    const dialog = bestImg.closest('[role="dialog"]') || bestImg.closest('.absolute.inset-0') || document.body;

    let rawPrompt = getBestPrompt(dialog);

    if (!rawPrompt) {
        rawPrompt = bestImg.alt || "";
    }

    if (!rawPrompt || rawPrompt === 'Explore') {
        rawPrompt = document.title;
        if (rawPrompt === 'Explore') {
            rawPrompt = "Prompt not found... (Image saved)";
        }
    }

    const { promptText, paramsText } = splitPromptAndParams(rawPrompt);



    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        alert('插件连接已断开（可能是刚刚更新了插件）。\n请刷新当前页面即可恢复！');
        setButtonState(btn, '请刷页面', 'error', true);
        return;
    }

    try {
        chrome.runtime.sendMessage({
            action: "saveToNotion",
            data: {
                imageUrl: imageUrl,
                prompt: promptText,
                parameters: paramsText,
                timestamp: new Date().toISOString()
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message;
                if (msg.includes("Extension context invalidated")) {
                    alert('插件已更新，请刷新当前页面后重试。');
                    setButtonState(btn, '请刷新', 'error', true);
                } else {
                    alert('插件错误: ' + msg);
                    setButtonState(btn, '错误', 'error', true);
                }
                setTimeout(() => resetBtn(btn, originalText), 2000);
            } else if (response && response.success) {
                const notionPageUrl = getNotionPageUrl(response);

                if (notionPageUrl) {
                    btn.dataset.notionPageUrl = notionPageUrl;
                    setButtonState(btn, '已保存，打开页面 ↗', 'success', false);
                    setTimeout(() => {
                        if (btn.dataset.notionPageUrl === notionPageUrl) {
                            resetBtn(btn, originalText);
                        }
                    }, 8000);
                } else {
                    setButtonState(btn, '已保存!', 'success', true);
                    setTimeout(() => resetBtn(btn, originalText), 2000);
                }
            } else {
                setButtonState(btn, '失败', 'error', true);
                console.error("Save failed:", response ? response.error : 'Unknown');
                setTimeout(() => resetBtn(btn, originalText), 2000);
            }
        });
    } catch (e) {
        console.error("Runtime error:", e);
        alert('运行时错误: ' + e.message + '\n请刷新网页重试。');
        setButtonState(btn, '错误', 'error', true);
        setTimeout(() => resetBtn(btn, originalText), 2000);
    }
}

function resetBtn(btn, text = 'Save to Notion') {
    delete btn.dataset.notionPageUrl;
    setButtonState(btn, text, 'idle', false);
}

const observer = new MutationObserver(debounce(() => {
    createButton();
}, 500));

observer.observe(document.body, { childList: true, subtree: true });

createButton();
