import { expect, test } from '#test';

test.describe('AuthCodeInput forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<form id="form"><input id="auth" name="code" value="123456"></form>';
            window.authCodeInputEvents = { changes: 0, submits: 0 };
            document.querySelector('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.authCodeInputEvents.submits++;
            });
            $.addEvent('#auth', 'change.ui.authcodeinput', () => window.authCodeInputEvents.changes++);
        });
    });

    test.describe('autoSubmit', () => {
        for (const source of ['option', 'data attribute']) {
            test(`submits only when user input is complete (${source})`, async ({ page }) => {
                await page.evaluate((source) => {
                    const auth = document.querySelector('#auth');
                    auth.value = '';
                    if (source === 'data attribute') {
                        auth.setAttribute('data-ui-auto-submit', 'true');
                        auth.setAttribute('data-ui-length', '3');
                    }
                    UI.AuthCodeInput.init(auth, source === 'option' ? { autoSubmit: true, length: 3 } : {});
                }, source);

                const inputs = page.locator('.d-flex input');
                await inputs.nth(0).press('1');
                await inputs.nth(1).press('2');
                expect(await page.evaluate((_) => window.authCodeInputEvents.submits)).toBe(0);
                await inputs.nth(2).press('3');
                expect(await page.evaluate((_) => window.authCodeInputEvents.submits)).toBe(1);
            });
        }

        test('does not require a form', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.evaluate((_) => {
                document.body.innerHTML = '<input id="auth">';
                UI.AuthCodeInput.init(document.querySelector('#auth'), { autoSubmit: true, length: 2 });
            });
            const inputs = page.locator('.d-flex input');
            await inputs.first().press('1');
            await inputs.last().press('2');

            await expect(page.locator('#auth')).toHaveValue('12');
            expect(errors).toEqual([]);
        });

        for (const { name, value, expected } of [
            { name: 'complete value', value: '123', expected: '123' },
            { name: 'filtered value', value: '1a2b3', expected: '123' },
            { name: 'truncated value', value: '1234', expected: '123' },
            { name: 'clear', value: null, expected: '' },
        ]) {
            test(`keeps programmatic changes silent (${name})`, async ({ page }) => {
                await page.evaluate((value) => {
                    const instance = UI.AuthCodeInput.init(document.querySelector('#auth'), {
                        autoSubmit: true,
                        length: 3,
                    });
                    instance.setValue('9');
                    if (value === null) {
                        instance.clear();
                    } else {
                        instance.setValue(value);
                    }
                }, value);

                await expect(page.locator('#auth')).toHaveValue(expected);
                expect(await page.evaluate((_) => window.authCodeInputEvents)).toEqual({ changes: 0, submits: 0 });
            });
        }

        for (const { name, expected } of [
            { name: 'clear', expected: '' },
            { name: 'replace', expected: '456' },
        ]) {
            test(`does not submit after a change listener calls ${name}`, async ({ page }) => {
                await page.evaluate((name) => {
                    const auth = document.querySelector('#auth');
                    auth.value = '12';
                    const instance = UI.AuthCodeInput.init(auth, { autoSubmit: true, length: 3 });
                    $.addEvent('#auth', 'change.ui.authcodeinput', () => {
                        if (name === 'clear') {
                            instance.clear();
                        } else {
                            instance.setValue('456');
                        }
                    });
                }, name);
                await page.locator('.d-flex input').last().press('3');

                await expect(page.locator('#auth')).toHaveValue(expected);
                expect(await page.evaluate((_) => window.authCodeInputEvents)).toEqual({ changes: 1, submits: 0 });
            });
        }
    });

    test.describe('reset', () => {
        test.beforeEach(async ({ page }) => {
            await page.clock.install({ time: 0 });
            await page.clock.pauseAt(1000);
            await page.evaluate((_) => {
                UI.AuthCodeInput.init(document.querySelector('#auth'), { autoSubmit: true });
            });
        });

        for (const initial of ['', '12', '123456']) {
            test(`restores the default value and tab order (${initial || 'empty'})`, async ({ page }) => {
                await page.evaluate((initial) => {
                    const auth = document.querySelector('#auth');
                    auth.defaultValue = initial;
                    $.getData(auth, 'authcodeinput').setValue('987654');
                    document.querySelector('#form').reset();
                }, initial);
                await page.clock.runFor(1);

                await expect(page.locator('#auth')).toHaveValue(initial);
                const inputs = page.locator('.d-flex input');
                for (let index = 0; index < 6; index++) {
                    await expect(inputs.nth(index)).toHaveValue(initial[index] || '');
                    if (index > initial.length) {
                        await expect(inputs.nth(index)).toHaveAttribute('tabindex', '-1');
                    } else {
                        await expect(inputs.nth(index)).not.toHaveAttribute('tabindex');
                    }
                }
                expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).get('code'))).toBe(initial);
                expect(await page.evaluate((_) => window.authCodeInputEvents)).toEqual({ changes: 0, submits: 0 });
            });
        }

        test('leaves values and tab order alone when reset is canceled', async ({ page }) => {
            await page.evaluate((_) => {
                $.getData('#auth', 'authcodeinput').setValue('98');
                const form = document.querySelector('#form');
                form.addEventListener('reset', (event) => event.preventDefault());
                form.reset();
            });
            await page.clock.runFor(1);

            await expect(page.locator('#auth')).toHaveValue('98');
            const inputs = page.locator('.d-flex input');
            for (let index = 0; index < 6; index++) {
                await expect(inputs.nth(index)).toHaveValue('98'[index] || '');
            }
            await expect(page.locator('.d-flex input[tabindex="-1"]')).toHaveCount(3);
            expect(await page.evaluate((_) => window.authCodeInputEvents)).toEqual({ changes: 0, submits: 0 });
        });

        test('finishes a reset when a later reset is canceled', async ({ page }) => {
            await page.evaluate((_) => {
                $.getData('#auth', 'authcodeinput').clear();
                const form = document.querySelector('#form');
                form.reset();
                form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
                form.reset();
            });
            await page.clock.runFor(1);

            await expect(page.locator('#auth')).toHaveValue('123456');
            const inputs = page.locator('.d-flex input');
            for (let index = 0; index < 6; index++) {
                await expect(inputs.nth(index)).toHaveValue('123456'[index]);
            }
            await expect(page.locator('.d-flex input[tabindex]')).toHaveCount(0);
        });

        test('ignores a pending reset after disposal', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.evaluate((_) => {
                document.querySelector('#form').reset();
                $.getData('#auth', 'authcodeinput').dispose();
            });
            await page.clock.runFor(1);

            await expect(page.locator('.d-flex')).toHaveCount(0);
            await expect(page.locator('#auth')).toHaveValue('123456');
            expect(errors).toEqual([]);
        });

        test('keeps other instances subscribed when one is disposed', async ({ page }) => {
            await page.evaluate((_) => {
                const form = document.querySelector('#form');
                const auth2 = document.createElement('input');
                auth2.id = 'auth2';
                auth2.defaultValue = '654321';
                form.append(auth2);
                UI.AuthCodeInput.init(auth2).clear();
                $.getData('#auth', 'authcodeinput').dispose();
                form.reset();
            });
            await page.clock.runFor(1);

            await expect(page.locator('#auth2')).toHaveValue('654321');
            const inputs = page.locator('.d-flex input');
            await expect(inputs).toHaveCount(6);
            for (let index = 0; index < 6; index++) {
                await expect(inputs.nth(index)).toHaveValue('654321'[index]);
            }
        });
    });
});
