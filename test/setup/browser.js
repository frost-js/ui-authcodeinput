/** @import { Page } from '@playwright/test'; */

/**
 * Reset the browser page and AuthCodeInput defaults.
 * @param {Page} page The Playwright page.
 * @returns {Promise<void>} The promise.
 */
export async function resetPage(page) {
    await page.goto('/', {
        waitUntil: 'domcontentloaded',
    });

    const stateReset = await page.evaluate((_) => {
        if (!window.fQuery || !window.UI?.AuthCodeInput) {
            return false;
        }

        window.$ = window.fQuery;

        UI.AuthCodeInput.defaults.style = 'outline';
        UI.AuthCodeInput.defaults.length = [3, 3];
        UI.AuthCodeInput.defaults.regExp = '[0-9]';
        UI.AuthCodeInput.defaults.autoSubmit = false;
        UI.AuthCodeInput.defaults.getAriaLabel = (index) => `Character ${index}`;

        $.empty(document.body);

        return window.$ === window.fQuery &&
            typeof $.QuerySet.prototype.authcodeinput === 'function';
    });

    if (!stateReset) {
        throw new Error('Failed to restore AuthCodeInput on the test page.');
    }

    await page.waitForFunction((_) => {
        const test = $.create('div', { class: 'text-center' });
        $.append(document.body, test);
        const ready = $.css(test, 'text-align') === 'center';
        $.remove(test);
        return ready;
    });
}
