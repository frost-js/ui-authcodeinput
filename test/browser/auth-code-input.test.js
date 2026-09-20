import { expect, test } from '#test';

test.describe('AuthCodeInput', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<input id="auth"><input id="auth2">';
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.AuthCodeInput.init(document.querySelector('#auth')) },
            { name: 'QuerySet', init: () => $('#auth').authcodeinput() },
        ]) {
            test(`creates an AuthCodeInput (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.AuthCodeInput)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#auth', 'authcodeinput') === value)).toBe(true);
                await expect(page.locator('.d-flex input')).toHaveCount(6);
            });
        }

        test('creates multiple AuthCodeInputs (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('input').authcodeinput();
                return ['#auth', '#auth2'].every((selector) =>
                    $.getData(selector, 'authcodeinput') instanceof UI.AuthCodeInput,
                );
            })).toBe(true);
        });

        test('returns the first AuthCodeInput (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const authCodeInput = $('input').authcodeinput();
                return authCodeInput === $.getData('#auth', 'authcodeinput');
            })).toBe(true);
        });

        test('reuses an existing AuthCodeInput', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = document.querySelector('#auth');
                const first = UI.AuthCodeInput.init(auth, { length: 4 });
                const second = UI.AuthCodeInput.init(auth, { length: 2 });
                return first === second;
            })).toBe(true);
            await expect(page.locator('.d-flex input')).toHaveCount(4);
        });

        test('exposes frozen default options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init(document.querySelector('#auth'));
                return {
                    autoSubmit: authCodeInput.options.autoSubmit,
                    frozen: Object.isFrozen(authCodeInput.options),
                    label: authCodeInput.options.getAriaLabel(2),
                    length: authCodeInput.options.length,
                    regExp: authCodeInput.options.regExp,
                    style: authCodeInput.options.style,
                };
            })).toEqual({
                autoSubmit: false,
                frozen: true,
                label: 'Character 2',
                length: [3, 3],
                regExp: '[0-9]',
                style: 'outline',
            });
        });

        for (const { name, value, expected } of [
            { name: 'renders', value: '1234', expected: '1234' },
            { name: 'filters', value: '1a2-3', expected: '123' },
            { name: 'truncates', value: '1234567', expected: '123456' },
        ]) {
            test(`${name} an initial value`, async ({ page }) => {
                await page.evaluate((value) => {
                    const auth = document.querySelector('#auth');
                    auth.value = value;
                    UI.AuthCodeInput.init(auth);
                }, value);

                await expect(page.locator('#auth')).toHaveValue(expected);
                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(6);
                for (let index = 0; index < 6; index++) {
                    await expect(inputs.nth(index)).toHaveValue(expected[index] || '');
                }
            });
        }
    });

    test.describe('#dispose', () => {
        for (const { name, dispose } of [
            { name: 'class', dispose: ({ instance }) => instance.dispose() },
            { name: 'QuerySet', dispose: () => $('#auth').authcodeinput('dispose') },
        ]) {
            test(`removes the AuthCodeInput and restores the original input (${name})`, async ({ page }) => {
                const state = await page.evaluateHandle((_) => {
                    document.body.innerHTML = '<input class="existing" id="auth" tabindex="4">';
                    const auth = document.querySelector('#auth');
                    const instance = UI.AuthCodeInput.init(auth);
                    const container = auth.previousElementSibling;
                    auth.classList.add('runtime');
                    return { instance, container };
                });
                await page.evaluate(dispose, state);

                expect(await state.evaluate(({ instance, container }) => ({
                    connected: container.isConnected,
                    registered: $.hasData('#auth', 'authcodeinput'),
                    node: instance.node,
                    options: instance.options,
                }))).toEqual({ connected: false, registered: false, node: null, options: null });
                await expect(page.locator('#auth')).toHaveClass('existing runtime');
                await expect(page.locator('#auth')).toHaveAttribute('tabindex', '4');
                await expect(page.locator('.d-flex')).toHaveCount(0);
            });
        }

        test('restores existing hidden and absent tabindex state', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.innerHTML = '<input class="visually-hidden existing" id="auth">';
                const auth = document.querySelector('#auth');
                UI.AuthCodeInput.init(auth).dispose();
            });

            const auth = page.locator('#auth');
            await expect(auth).toHaveClass('visually-hidden existing');
            await expect(auth).not.toHaveAttribute('tabindex');
        });

        test('removes the AuthCodeInput when the original input is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = document.querySelector('#auth');
                const authCodeInput = UI.AuthCodeInput.init(auth);
                const container = $.prev(auth).shift();
                $.remove(auth);
                return {
                    containerConnected: container.isConnected,
                    inputConnected: auth.isConnected,
                    node: authCodeInput.node,
                    options: authCodeInput.options,
                };
            })).toEqual({ containerConnected: false, inputConnected: false, node: null, options: null });

            await expect(page.locator('#auth')).toHaveCount(0);
            await expect(page.locator('.d-flex')).toHaveCount(0);
        });

        test.describe('disposal in a change listener', () => {
            for (const { name, initial, action, expected } of [
                { name: 'typing', initial: '12', action: (inputs) => inputs.last().press('3'), expected: '123' },
                { name: 'backspace on a filled input', initial: '123', action: (inputs) => inputs.last().press('Backspace'), expected: '12' },
                { name: 'backspace on an empty input', initial: '12', action: (inputs) => inputs.last().press('Backspace'), expected: '1' },
                {
                    name: 'autofill', initial: '', expected: '123',
                    action: (inputs) => inputs.first().evaluate((input) => {
                        input.value = '123';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }),
                },
                {
                    name: 'paste', initial: '', expected: '123',
                    action: (inputs) => inputs.first().evaluate((input) => {
                        const event = new ClipboardEvent('paste', {
                            bubbles: true,
                            cancelable: true,
                        });
                        // Firefox leaves DataTransfer-backed synthetic paste events empty.
                        Object.defineProperty(event, 'clipboardData', {
                            value: { getData: (_) => '123' },
                        });
                        input.dispatchEvent(event);
                    }),
                },
            ]) {
                test(`can dispose during ${name}`, async ({ page }) => {
                    const errors = [];
                    page.on('pageerror', (error) => errors.push(error.message));
                    await page.evaluate((initial) => {
                        document.body.innerHTML = '<form id="form"><input id="auth"></form>';
                        window.authCodeInputEvents = { changes: 0, submits: 0 };
                        document.querySelector('#form').addEventListener('submit', (event) => {
                            event.preventDefault();
                            window.authCodeInputEvents.submits++;
                        });
                        $.addEvent('#auth', 'change.ui.authcodeinput', () => window.authCodeInputEvents.changes++);
                        const auth = document.querySelector('#auth');
                        auth.value = initial;
                        const instance = UI.AuthCodeInput.init(auth, { autoSubmit: true, length: 3 });
                        $.addEvent(auth, 'change.ui.authcodeinput', () => instance.dispose());
                    }, initial);
                    await action(page.locator('.d-flex input'));

                    await expect(page.locator('.d-flex')).toHaveCount(0);
                    await expect(page.locator('#auth')).toHaveValue(expected);
                    expect(await page.evaluate((_) => window.authCodeInputEvents)).toEqual({ changes: 1, submits: 0 });
                    expect(errors).toEqual([]);
                });
            }
        });
    });

    test.describe('#clear', () => {
        for (const { name, clear } of [
            { name: 'class', clear: () => $.getData('#auth', 'authcodeinput').clear() },
            { name: 'QuerySet', clear: () => $('#auth').authcodeinput('clear') },
        ]) {
            test(`clears the value (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    UI.AuthCodeInput.init(document.querySelector('#auth')).setValue('987654');
                });
                await page.evaluate(clear);

                await expect(page.locator('#auth')).toHaveValue('');
                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(6);
                for (let index = 0; index < 6; index++) {
                    await expect(inputs.nth(index)).toHaveValue('');
                }
            });
        }
    });

    for (const method of ['disable', 'enable']) {
        test.describe(`#${method}`, () => {
            for (const { name, update } of [
                { name: 'class', update: (method) => $.getData('#auth', 'authcodeinput')[method]() },
                { name: 'QuerySet', update: (method) => $('#auth').authcodeinput(method) },
            ]) {
                test(`${method}s the AuthCodeInput (${name})`, async ({ page }) => {
                    await page.evaluate((method) => {
                        const instance = UI.AuthCodeInput.init(document.querySelector('#auth'));
                        if (method === 'enable') {
                            instance.disable();
                        }
                    }, method);
                    await page.evaluate(update, method);

                    const enabled = method === 'enable';
                    await expect(page.locator('#auth')).toBeEnabled({ enabled });
                    const inputs = page.locator('.d-flex input');
                    await expect(inputs).toHaveCount(6);
                    for (let index = 0; index < 6; index++) {
                        await expect(inputs.nth(index)).toBeEnabled({ enabled });
                    }
                });
            }
        });
    }

    test.describe('#getValue', () => {
        for (const { name, getValue } of [
            { name: 'class', getValue: () => $.getData('#auth', 'authcodeinput').getValue() },
            { name: 'QuerySet', getValue: () => $('#auth').authcodeinput('getValue') },
        ]) {
            test(`gets the value (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    UI.AuthCodeInput.init(document.querySelector('#auth')).setValue('1234');
                });

                expect(await page.evaluate(getValue)).toBe('1234');
            });
        }
    });

    test.describe('#setValue', () => {
        for (const { name, setValue } of [
            { name: 'class', setValue: (value) => $.getData('#auth', 'authcodeinput').setValue(value) },
            { name: 'QuerySet', setValue: (value) => $('#auth').authcodeinput('setValue', value) },
        ]) {
            test(`sets the value (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    UI.AuthCodeInput.init(document.querySelector('#auth')).setValue('987654');
                });
                await page.evaluate(setValue, '1234');

                await expect(page.locator('#auth')).toHaveValue('1234');
                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(6);
                for (let index = 0; index < 6; index++) {
                    await expect(inputs.nth(index)).toHaveValue('1234'[index] || '');
                }
            });
        }

        for (const { name, value, expected, length } of [
            { name: 'filters', value: 'a1b2c3', expected: '123', length: 6 },
            { name: 'truncates', value: '123456', expected: '123', length: 3 },
        ]) {
            test(`${name} the value`, async ({ page }) => {
                await page.evaluate(({ value, length }) => {
                    UI.AuthCodeInput.init(document.querySelector('#auth'), { length }).setValue(value);
                }, { value, length });

                await expect(page.locator('#auth')).toHaveValue(expected);
                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(length);
                for (let index = 0; index < length; index++) {
                    await expect(inputs.nth(index)).toHaveValue(expected[index] || '');
                }
            });
        }
    });

    test.describe('input attributes', () => {
        test('inherits the initial disabled state', async ({ page }) => {
            await page.evaluate((_) => {
                const auth = document.querySelector('#auth');
                auth.disabled = true;
                UI.AuthCodeInput.init(auth);
            });

            await expect(page.locator('.d-flex input:disabled')).toHaveCount(6);
        });

        test('preserves readonly during typing, backspace and paste', async ({ page }) => {
            await page.evaluate((_) => {
                const auth = document.querySelector('#auth');
                auth.readOnly = true;
                auth.value = '12';
                UI.AuthCodeInput.init(auth);
            });

            const inputs = page.locator('.d-flex input');
            await expect(page.locator('.d-flex input[readonly]')).toHaveCount(6);
            await inputs.first().press('3');
            await expect(page.locator('#auth')).toHaveValue('12');
            await inputs.first().press('Backspace');
            await expect(page.locator('#auth')).toHaveValue('12');
            await inputs.nth(2).press('Backspace');
            await expect(page.locator('#auth')).toHaveValue('12');
            await inputs.first().evaluate((input) => {
                const event = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                });
                Object.defineProperty(event, 'clipboardData', {
                    value: { getData: (_) => '654321' },
                });
                input.dispatchEvent(event);
            });

            await expect(page.locator('#auth')).toHaveValue('12');
            for (let index = 0; index < 6; index++) {
                await expect(inputs.nth(index)).toHaveValue('12'[index] || '');
            }

            await page.evaluate((_) => $.getData('#auth', 'authcodeinput').setValue('345678'));
            await expect(page.locator('#auth')).toHaveValue('345678');
            await expect(inputs.first()).toHaveValue('3');
        });

        test('renders autocomplete attributes', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init(document.querySelector('#auth'));
            });

            const inputs = page.locator('.d-flex input');
            await expect(inputs.first()).toHaveAttribute('autocomplete', 'one-time-code');
            await expect(inputs.nth(1)).toHaveAttribute('autocomplete', 'off');
            await expect(page.locator('.d-flex input[maxlength="1"]')).toHaveCount(6);
        });

        test('inherits required and ARIA attributes', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.innerHTML = `
                        <span id="description">Code</span>
                        <span id="error">Invalid</span>
                        <input
                            id="auth"
                            aria-describedby="description"
                            aria-errormessage="error"
                            aria-invalid="true"
                            aria-required="true"
                            required
                        >
                        <input id="auth2">
                    `;
                UI.AuthCodeInput.init(document.querySelector('#auth'));
                UI.AuthCodeInput.init(document.querySelector('#auth2'));
            });

            const containers = page.locator('.d-flex');
            const inputs = containers.first().locator('input');
            await expect(inputs).toHaveCount(6);
            for (let index = 0; index < 6; index++) {
                const input = inputs.nth(index);
                await expect(input).toHaveAttribute('aria-required', 'true');
                await expect(input).toHaveAttribute('aria-describedby', 'description');
                await expect(input).toHaveAttribute('aria-errormessage', 'error');
                await expect(input).toHaveAttribute('aria-invalid', 'true');
                await expect(input).toHaveAttribute('required', '');
            }
            await expect(containers.nth(1).locator('input')).toHaveCount(6);
            await expect(containers.nth(1).locator('input[required]')).toHaveCount(0);
        });
    });

    test.describe('change event', () => {
        test('triggers a change event when the value changes', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = document.querySelector('#auth');
                UI.AuthCodeInput.init(auth);
                const events = [];
                $.addEvent(auth, 'change.ui.authcodeinput', (event) => {
                    events.push({
                        currentTarget: event.currentTarget.id,
                        detail: event.detail,
                        namespace: event.namespace,
                        target: event.target.id,
                        type: event.type,
                        value: event.currentTarget.value,
                    });
                });

                const inputs = $.find('input', $.prev(auth).shift());
                $.setValue(inputs[0], '1');
                $.triggerEvent(inputs[0], 'input');
                $.setValue(inputs[1], '2');
                $.triggerEvent(inputs[1], 'input');
                $.setValue(inputs[1], '2');
                $.triggerEvent(inputs[1], 'input');

                return events;
            })).toEqual([
                {
                    currentTarget: 'auth',
                    detail: null,
                    namespace: 'ui.authcodeinput',
                    target: 'auth',
                    type: 'change',
                    value: '1',
                },
                {
                    currentTarget: 'auth',
                    detail: null,
                    namespace: 'ui.authcodeinput',
                    target: 'auth',
                    type: 'change',
                    value: '12',
                },
            ]);
        });
    });

    test.describe('user events', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init(document.querySelector('#auth'));
            });
        });

        test.describe('typing and validation', () => {
            test('accepts valid input and advances focus', async ({ page }) => {
                const inputs = page.locator('.d-flex input');
                await inputs.first().press('1');

                await expect(page.locator('#auth')).toHaveValue('1');
                await expect(inputs.first()).toHaveValue('1');
                await expect(inputs.nth(1)).toBeFocused();

                await inputs.nth(1).press('2');
                await expect(page.locator('#auth')).toHaveValue('12');
                await expect(inputs.nth(2)).toBeFocused();
            });

            test('rejects invalid input', async ({ page }) => {
                const input = page.locator('.d-flex input').first();
                await input.press('A');

                await expect(page.locator('#auth')).toHaveValue('');
                await expect(input).toHaveValue('');
                await expect(input).toBeFocused();
            });
        });

        test.describe('paste and autofill', () => {
            test('distributes pasted input', async ({ page }) => {
                const allowed = await page.evaluate((_) => {
                    const auth = document.querySelector('#auth');
                    const inputs = $.find('input', $.prev(auth).shift());
                    const event = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                    });
                    Object.defineProperty(event, 'clipboardData', {
                        value: { getData: (_) => '12-3 456' },
                    });

                    return inputs[0].dispatchEvent(event);
                });

                expect(allowed).toBe(false);
                await expect(page.locator('#auth')).toHaveValue('123456');
                const inputs = page.locator('.d-flex input');
                const values = ['1', '2', '3', '4', '5', '6'];
                await expect(inputs).toHaveCount(values.length);
                for (const [index, value] of values.entries()) {
                    await expect(inputs.nth(index)).toHaveValue(value);
                }
                await expect(inputs.last()).toBeFocused();
            });

            test('distributes pasted input from the active input', async ({ page }) => {
                await page.evaluate((_) => {
                    const authCodeInput = $.getData('#auth', 'authcodeinput');
                    authCodeInput.setValue('12');
                    const inputs = $.find('input', $.prev('#auth').shift());
                    const event = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                    });
                    Object.defineProperty(event, 'clipboardData', {
                        value: { getData: (_) => '34-56' },
                    });
                    inputs[2].dispatchEvent(event);
                });

                await expect(page.locator('#auth')).toHaveValue('123456');
            });

            test('ignores pasted input without valid characters', async ({ page }) => {
                await page.evaluate((_) => {
                    const authCodeInput = $.getData('#auth', 'authcodeinput');
                    authCodeInput.setValue('12');
                    const input = $.findOne('input', $.prev('#auth').shift());
                    const event = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                    });
                    Object.defineProperty(event, 'clipboardData', {
                        value: { getData: (_) => 'abc' },
                    });
                    input.dispatchEvent(event);
                });

                await expect(page.locator('#auth')).toHaveValue('12');
            });

            test('distributes multi-character autofill input', async ({ page }) => {
                await page.evaluate((_) => {
                    const auth = document.querySelector('#auth');
                    const inputs = $.find('input', $.prev(auth).shift());
                    $.setValue(inputs[0], '65a4-321');
                    $.triggerEvent(inputs[0], 'input');
                });

                await expect(page.locator('#auth')).toHaveValue('654321');
                const inputs = page.locator('.d-flex input');
                const values = ['6', '5', '4', '3', '2', '1'];
                await expect(inputs).toHaveCount(values.length);
                for (const [index, value] of values.entries()) {
                    await expect(inputs.nth(index)).toHaveValue(value);
                }
                await expect(inputs.last()).toBeFocused();
            });

            test('clears multi-character input without valid characters', async ({ page }) => {
                await page.evaluate((_) => {
                    const input = $.findOne('input', $.prev('#auth').shift());
                    $.setValue(input, 'abc');
                    $.triggerEvent(input, 'input');
                });

                await expect(page.locator('#auth')).toHaveValue('');
                await expect(page.locator('.d-flex input').first()).toHaveValue('');
            });
        });

        test.describe('keyboard', () => {
            for (const modifier of ['ctrlKey', 'metaKey']) {
                for (const key of ['a', 'c', 'v', 'x']) {
                    test(`allows ${modifier} + ${key}`, async ({ page }) => {
                        const prevented = await page.locator('.d-flex input').first().evaluate((input, { modifier, key }) => {
                            const event = new KeyboardEvent('keydown', {
                                bubbles: true,
                                cancelable: true,
                                key,
                                code: `Key${key.toUpperCase()}`,
                                [modifier]: true,
                            });
                            input.dispatchEvent(event);
                            return event.defaultPrevented;
                        }, { modifier, key });

                        expect(prevented).toBe(false);
                    });
                }
            }

            test('supports keyboard select-all, copy, cut and paste', async ({ page, browserName }) => {
                test.skip(browserName !== 'chromium', 'Clipboard permissions are configured for Chromium.');
                await page.evaluate((_) => $.getData('#auth', 'authcodeinput').setValue('1'));
                const input = page.locator('.d-flex input').first();
                await input.focus();
                // Remove the selection made by focusin so select-all must select the digit.
                await input.evaluate((input) => input.setSelectionRange(1, 1));
                await input.press('ControlOrMeta+a');
                expect(await input.evaluate((input) => [input.selectionStart, input.selectionEnd])).toEqual([0, 1]);
                await input.press('ControlOrMeta+c');
                expect(await page.evaluate((_) => navigator.clipboard.readText())).toBe('1');
                await input.press('ControlOrMeta+x');
                await expect(page.locator('#auth')).toHaveValue('');
                await input.press('ControlOrMeta+v');
                await expect(page.locator('#auth')).toHaveValue('1');
                await expect(page.locator('.d-flex input').nth(1)).toBeFocused();
            });

            test('handles backspace from filled and empty inputs', async ({ page }) => {
                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('123');
                });
                const inputs = page.locator('.d-flex input');
                await inputs.nth(2).focus();
                await inputs.nth(2).press('Backspace');

                await expect(page.locator('#auth')).toHaveValue('12');
                await expect(inputs.nth(2)).toHaveValue('');

                await inputs.nth(2).press('Backspace');

                await expect(page.locator('#auth')).toHaveValue('1');
                await expect(inputs.nth(1)).toHaveValue('');
                await expect(inputs.nth(1)).toBeFocused();
            });

            test('keeps backspace on the first empty input', async ({ page }) => {
                const input = page.locator('.d-flex input').first();
                await input.focus();
                await input.press('Backspace');

                await expect(page.locator('#auth')).toHaveValue('');
                await expect(input).toBeFocused();
            });

            test('navigates with arrow keys', async ({ page }) => {
                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('123456');
                });
                const inputs = page.locator('.d-flex input');
                await inputs.nth(2).focus();
                await inputs.nth(2).press('ArrowLeft');
                await expect(inputs.nth(1)).toBeFocused();

                await inputs.nth(1).press('ArrowRight');
                await expect(inputs.nth(2)).toBeFocused();
            });

            test('keeps arrow keys within the input boundaries', async ({ page }) => {
                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('123456');
                });
                const inputs = page.locator('.d-flex input');
                await inputs.first().focus();
                await inputs.first().press('ArrowLeft');
                await expect(inputs.first()).toBeFocused();

                await inputs.last().focus();
                await inputs.last().press('ArrowRight');
                await expect(inputs.last()).toBeFocused();
            });

            test('uses physical arrow directions in RTL', async ({ page }) => {
                await page.evaluate((_) => {
                    const auth = document.querySelector('#auth');
                    $.setAttribute(auth, { dir: 'rtl' });
                    $.getData(auth, 'authcodeinput').dispose();
                    UI.AuthCodeInput.init(auth).setValue('123456');
                });

                const container = page.locator('.d-flex');
                const inputs = container.locator('input');
                await expect(container).toHaveAttribute('dir', 'rtl');
                await inputs.nth(2).focus();
                await inputs.nth(2).press('ArrowLeft');
                await expect(inputs.nth(3)).toBeFocused();

                await inputs.nth(3).press('ArrowRight');
                await expect(inputs.nth(2)).toBeFocused();

                await inputs.first().focus();
                await inputs.first().press('ArrowRight');
                await expect(inputs.first()).toBeFocused();

                expect(await inputs.evaluateAll((inputs) => {
                    const lefts = inputs.map((input) => input.getBoundingClientRect().left);
                    return lefts.every((left, index) => index === 0 || lefts[index - 1] > left);
                })).toBe(true);
            });
        });

        test.describe('focus and tab order', () => {
            test('keeps focus on the last input', async ({ page }) => {
                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('12345');
                });
                const input = page.locator('.d-flex input').last();
                await input.focus();
                await input.press('6');

                await expect(page.locator('#auth')).toHaveValue('123456');
                await expect(input).toBeFocused();
            });

            test('redirects focus to the next incomplete input', async ({ page }) => {
                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('12');
                });
                const inputs = page.locator('.d-flex input');
                await inputs.last().focus();

                await expect(inputs.nth(2)).toBeFocused();
            });

            test('redirects original input focus to a visible input', async ({ page }) => {
                await page.evaluate((_) => {
                    const authCodeInput = $.getData('#auth', 'authcodeinput');
                    authCodeInput.setValue('12');
                    $.focus('#auth');
                });
                const inputs = page.locator('.d-flex input');
                await expect(inputs.nth(2)).toBeFocused();

                await page.evaluate((_) => {
                    const authCodeInput = $.getData('#auth', 'authcodeinput');
                    authCodeInput.setValue('123456');
                    $.focus('#auth');
                });
                await expect(inputs.first()).toBeFocused();
            });

            test('updates the tab order', async ({ page }) => {
                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(6);
                await expect(inputs.first()).not.toHaveAttribute('tabindex');
                await expect(page.locator('.d-flex input[tabindex="-1"]')).toHaveCount(5);

                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('12');
                });
                await expect(inputs.nth(2)).not.toHaveAttribute('tabindex');
                await expect(page.locator('.d-flex input[tabindex="-1"]')).toHaveCount(3);

                await page.evaluate((_) => {
                    $.getData('#auth', 'authcodeinput').setValue('123456');
                });
                await expect(page.locator('.d-flex input[tabindex]')).toHaveCount(0);
            });
        });
    });

    test.describe('getAriaLabel option', () => {
        for (const { name, init, labels } of [
            {
                name: 'default',
                init: () => UI.AuthCodeInput.init(document.querySelector('#auth')),
                labels: ['Character 1', 'Character 2', 'Character 3', 'Character 4', 'Character 5', 'Character 6'],
            },
            {
                name: 'custom',
                init: () => UI.AuthCodeInput.init(document.querySelector('#auth'), {
                    getAriaLabel: (index) => `Digit ${index}`,
                    length: 3,
                }),
                labels: ['Digit 1', 'Digit 2', 'Digit 3'],
            },
        ]) {
            test(`renders accessible labels (${name})`, async ({ page }) => {
                await page.evaluate(init);

                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(labels.length);
                for (const [index, label] of labels.entries()) {
                    await expect(inputs.nth(index)).toHaveAttribute('aria-label', label);
                }
            });
        }
    });

    test.describe('length option', () => {
        for (const { name, options = {}, attributes = {}, segments } of [
            { name: 'default', segments: [3, 3] },
            { name: 'option', options: { length: [2, 4] }, segments: [2, 4] },
            { name: 'data attribute', attributes: { 'data-ui-length': '[2,2]' }, segments: [2, 2] },
            { name: 'shorter maxlength', attributes: { maxlength: '4' }, segments: [4] },
            { name: 'longer maxlength', attributes: { maxlength: '8' }, segments: [3, 3] },
        ]) {
            test(`renders the segmented layout (${name})`, async ({ page }) => {
                await page.evaluate(({ options, attributes }) => {
                    const auth = document.querySelector('#auth');
                    for (const [name, value] of Object.entries(attributes)) {
                        auth.setAttribute(name, value);
                    }
                    UI.AuthCodeInput.init(auth, options);
                }, { options, attributes });

                const container = page.locator('.d-flex');
                const length = segments.reduce((total, segment) => total + segment, 0);
                await expect(container).toHaveClass('d-flex justify-content-between');
                await expect(container.locator('input')).toHaveCount(length);
                await expect(container.locator(':scope > div.form-input.w-auto')).toHaveCount(length);
                await expect(container.locator(':scope > span.vr.align-self-center.fs-5'))
                    .toHaveCount(segments.length - 1);
                await expect(container.locator(':scope > *')).toHaveCount(length + segments.length - 1);
                let offset = 0;
                for (const segment of segments.slice(0, -1)) {
                    offset += segment;
                    await expect(container.locator(':scope > *').nth(offset))
                        .toHaveClass('vr align-self-center fs-5');
                    offset++;
                }
            });
        }
    });

    test.describe('regExp option', () => {
        test('renders numeric input hints by default', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init(document.querySelector('#auth'));
            });

            await expect(page.locator(
                '.d-flex input[inputmode="numeric"][pattern="[0-9]"]',
            )).toHaveCount(6);
        });

        for (const source of ['option', 'data attribute']) {
            test(`filters alphabetic input (${source})`, async ({ page }) => {
                await page.evaluate((source) => {
                    const auth = document.querySelector('#auth');
                    if (source === 'data attribute') {
                        auth.setAttribute('data-ui-reg-exp', '[A-Z]');
                    }
                    const options = source === 'option' ? { regExp: '[A-Z]' } : {};
                    UI.AuthCodeInput.init(auth, options).setValue('A1B2');
                }, source);

                await expect(page.locator('#auth')).toHaveValue('AB');
                await expect(page.locator('.d-flex input[inputmode="text"][pattern="[A-Z]"]'))
                    .toHaveCount(6);
            });
        }

        test('preserves the original inputmode', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute('#auth', { inputmode: 'email' });
                UI.AuthCodeInput.init(document.querySelector('#auth'));
            });

            await expect(page.locator('.d-flex input[inputmode="email"]')).toHaveCount(6);
        });
    });

    test.describe('style option', () => {
        for (const { name, options = {}, attribute, style } of [
            { name: 'default', style: 'outline' },
            { name: 'option', options: { style: 'filled' }, style: 'filled' },
            { name: 'data attribute', attribute: 'filled', style: 'filled' },
        ]) {
            test(`renders styled inputs (${name})`, async ({ page }) => {
                await page.evaluate(({ options, attribute }) => {
                    const auth = document.querySelector('#auth');
                    if (attribute) {
                        auth.setAttribute('data-ui-style', attribute);
                    }
                    UI.AuthCodeInput.init(auth, options);
                }, { options, attribute });

                const inputs = page.locator('.d-flex input');
                await expect(inputs).toHaveCount(6);
                for (let index = 0; index < 6; index++) {
                    await expect(inputs.nth(index)).toHaveClass(`input-${style} fw-bold text-center px-0`);
                }
                await expect(page.locator('.ripple-line')).toHaveCount(0);
            });
        }
    });
});
