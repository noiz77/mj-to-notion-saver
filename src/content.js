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
    btn.innerText = 'Save to Notion';
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
        btn.style.backgroundColor = '#333';
    };
    btn.onmouseout = () => {
        btn.style.transform = 'translateY(0)';
        btn.style.backgroundColor = '#1a1a1a';
    };

    btn.onclick = handleSave;

    document.body.appendChild(btn);
}

function getBestImage() {
    const images = Array.from(document.querySelectorAll('img'));

    const candidates = images.filter(img => {
        return (img.src && img.src.includes('cdn.midjourney.com')) ||
            (img.currentSrc && img.currentSrc.includes('cdn.midjourney.com'));
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
    const fullText = rootElement.innerText || "";
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let mainPrompt = "";
    let capturedParams = [];

    const validParams = [
        "ar", "aspect", "v", "version", "niji",
        "c", "chaos", "s", "stylize", "w", "weird",
        "q", "quality", "r", "repeat", "stop", "seed",
        "iw", "no", "tile", "video", "relax", "fast", "turbo",
        "style", "cref", "cw", "sref", "sw", "p", "personalize",
        "oref", "profile", "editor", "edit"
    ];

    const paramPattern = new RegExp(
        `(-{0,2})\\b(${validParams.join('|')})\\s+((?:https?:\\/\\/\\S+|[^\\n-]+))`,
        'gi'
    );

    lines.forEach(line => {
        if (line.length > mainPrompt.length && line.length > 5) {
            const isUI = [
                "Midjourney", "Discord", "Job ID", "Upscale", "Remix", "Vary",
                "Zoom", "Pan", "Web", "Creative", "Standard", "Short", "High",
                "Low", "Medium", "Light", "Dark", "Subtle", "Strong", "Region",
                "Favorite", "Image Weight", "Style Reference"
            ].some(keyword => line.includes(keyword) && line.length < 40);

            const isParamString = line.startsWith('--') || validParams.some(p => line.toLowerCase().startsWith(p + ' '));

            if (!isUI && !isParamString) {
                mainPrompt = line;
            }
        }

        let match;
        paramPattern.lastIndex = 0;

        while ((match = paramPattern.exec(line)) !== null) {
            const key = match[2].toLowerCase();
            let val = match[3].trim();

            if (val.length > 0) {
                const standardized = `--${key} ${val}`;
                if (!capturedParams.includes(standardized)) {
                    capturedParams.push(standardized);
                }
            }
        }
    });

    if (!mainPrompt) return null;

    let finalStr = mainPrompt;

    if (capturedParams.length > 0) {
        const paramStr = capturedParams.join(' ');
        if (!finalStr.toLowerCase().includes(paramStr.split(' ')[0])) {
            finalStr += " " + paramStr;
        }
    }

    return finalStr;
}

function cleanImageUrl(url) {
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

function handleSave() {
    const btn = document.getElementById('mj-notion-save-btn');
    const originalText = 'Save to Notion';

    if (btn.disabled) return;

    btn.innerText = '提取中...';
    btn.disabled = true;

    const bestImg = getBestImage();
    if (!bestImg) {
        alert('未找到有效图片 (No Image Found)。请先点击图片进入大图/灯箱模式。');
        btn.innerText = '无图片';
        setTimeout(() => resetBtn(btn, originalText), 2000);
        return;
    }

    const imageUrl = cleanImageUrl(bestImg.src || bestImg.currentSrc);

    const dialog = bestImg.closest('[role="dialog"]') || bestImg.closest('.absolute.inset-0') || document.body;

    let rawPrompt = getBestPrompt(dialog);

    if (!rawPrompt) {
        rawPrompt = bestImg.alt || "";
    }

    if (!rawPrompt || rawPrompt === 'Explore' || rawPrompt.length < 5) {
        rawPrompt = document.title;
        if (rawPrompt === 'Explore') {
            rawPrompt = "Prompt not found... (Image saved)";
        }
    }

    const { promptText, paramsText } = splitPromptAndParams(rawPrompt);



    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        alert('插件连接已断开（可能是刚刚更新了插件）。\n请刷新当前页面即可恢复！');
        btn.innerText = '请刷页面';
        btn.style.backgroundColor = '#cc0000';
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
                    btn.innerText = '请刷新';
                } else {
                    alert('插件错误: ' + msg);
                    btn.innerText = '错误';
                }
                btn.style.backgroundColor = '#cc0000';
            } else if (response && response.success) {
                btn.innerText = '已保存!';
                btn.style.backgroundColor = '#2d862d';
            } else {
                btn.innerText = '失败';
                btn.style.backgroundColor = '#cc0000';
                console.error("Save failed:", response ? response.error : 'Unknown');
            }
            setTimeout(() => resetBtn(btn, originalText), 2000);
        });
    } catch (e) {
        console.error("Runtime error:", e);
        alert('运行时错误: ' + e.message + '\n请刷新网页重试。');
        btn.innerText = '错误';
        btn.style.backgroundColor = '#cc0000';
        setTimeout(() => resetBtn(btn, originalText), 2000);
    }
}

function resetBtn(btn, text = 'Save to Notion') {
    btn.innerText = text;
    btn.disabled = false;
    btn.style.backgroundColor = '#1a1a1a';
}

const observer = new MutationObserver(debounce(() => {
    createButton();
}, 500));

observer.observe(document.body, { childList: true, subtree: true });

createButton();
