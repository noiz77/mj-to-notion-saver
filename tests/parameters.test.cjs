const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({document: {getElementById: () => null}});
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/content.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('const observer =')), context);
const prompt = 'A beautiful landscape with mountains at sunset';
function params(text) {
    return context.splitPromptAndParams(context.getBestPrompt({ innerText: text })).paramsText;
}
test('UI prose does not create parameters', () => {
    assert.equal(params(`${prompt}\nStyle Creator\nquality and refine with variations.`), '');
});
test('current parameters and standalone flags survive', () => {
    assert.equal(params(`${prompt} --v 8.2 --raw --hd --sv 6 --exp 20 --edit https://example.com/a.png`), '--v 8.2 --raw --hd --sv 6 --exp 20 --edit https://example.com/a.png');
});
test('separate parameters merge with inline parameters', () => {
    assert.equal(params(`${prompt} --v 7\n--tile\nquality 2\nar 16:9`), '--v 7 --tile --quality 2 --ar 16:9');
});
test('legacy and niji parameters remain available', () => {
    assert.equal(params(`${prompt} --niji 7 --style raw --q 2 --cref https://example.com/a-b.png`), '--niji 7 --style raw --q 2 --cref https://example.com/a-b.png');
});
test('future explicit parameters are retained', () => {
    assert.equal(params(`${prompt} --future-feature value`), '--future-feature value');
});
test('screenshot: short prompt before parameter chips beats page prose', () => {
    const text = '_donye\n3w\n15\nar 2:3\nprofile bv6pti6\nprofile cwcyiy3\nCopy prompt\nExplore at draft quality and refine with variations.';
    assert.equal(context.getBestPrompt({innerText: text}), '15 --ar 2:3 --profile bv6pti6 --profile cwcyiy3');
});

test('real lightbox structure excludes background authors and draft instructions', () => {
    context.document.getElementById = () => ({
        querySelector: () => ({innerText: '15'}),
        querySelectorAll: () => ['--ar 2:3', 'ar', 'ar 2:3', '--profile bv6pti6', 'profile', '--profile cwcyiy3'].map(textContent => ({textContent}))
    });
    try {
        assert.equal(context.getBestPrompt({innerText: 'Dishwasher Lasagna\nExplore at draft quality and refine with variations.'}), '15 --ar 2:3 --profile bv6pti6 --profile cwcyiy3');
    } finally {
        context.document.getElementById = () => null;
    }
});
