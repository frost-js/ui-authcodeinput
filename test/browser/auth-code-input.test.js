import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';

test.beforeEach(async ({ page }) => {
    await resetPage(page);
});

test.describe('AuthCodeInput', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            $.setHTML(
                document.body,
                '<input id="auth"><input id="auth2">',
            );
        });
    });

    test.describe('#init', () => {
        test('creates an AuthCodeInput', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = $.findOne('#auth');
                return UI.AuthCodeInput.init(auth) instanceof UI.AuthCodeInput;
            })).toBe(true);
        });

        test('creates an AuthCodeInput (query)', async ({ page }) => {
            expect(await page.evaluate((_) =>
                $('#auth').authcodeinput() instanceof UI.AuthCodeInput)).toBe(true);
        });

        test('creates multiple AuthCodeInputs (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('input').authcodeinput();
                return ['#auth', '#auth2'].every((selector) =>
                    $.getData(selector, 'authcodeinput') instanceof UI.AuthCodeInput,
                );
            })).toBe(true);
        });

        test('returns the first AuthCodeInput (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const authCodeInput = $('input').authcodeinput();
                return authCodeInput === $.getData('#auth', 'authcodeinput');
            })).toBe(true);
        });

        test('reuses an existing AuthCodeInput', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = $.findOne('#auth');
                const first = UI.AuthCodeInput.init(auth, { length: 4 });
                const second = UI.AuthCodeInput.init(auth, { length: 2 });
                return first === second;
            })).toBe(true);
            await expect(page.locator('.d-flex input')).toHaveCount(4);
        });

        test('exposes frozen default options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
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

        test('renders an initial value', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(document.body, '<input id="auth" value="1234">');
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            const inputs = page.locator('.d-flex input');
            const values = ['1', '2', '3', '4', '', ''];
            await expect(inputs).toHaveCount(values.length);
            for (const [index, value] of values.entries()) {
                await expect(inputs.nth(index)).toHaveValue(value);
            }
            await expect(page.locator('#auth')).toHaveValue('1234');
        });

        test('filters an initial value', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(document.body, '<input id="auth" value="1a2-3">');
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('#auth')).toHaveValue('123');
        });
    });

    test.describe('#dispose', () => {
        test('removes the AuthCodeInput and restores the original input', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<input class="existing" id="auth" tabindex="4">',
                );
                const auth = $.findOne('#auth');
                const authCodeInput = UI.AuthCodeInput.init(auth);
                const container = $.prev(auth).shift();
                $.addClass(auth, 'runtime');
                authCodeInput.dispose();
                return !$.isConnected(container) &&
                    !$.hasData(auth, 'authcodeinput') &&
                    authCodeInput.node === null &&
                    authCodeInput.options === null;
            })).toBe(true);

            await expect(page.locator('#auth')).toHaveClass('existing runtime');
            await expect(page.locator('#auth')).toHaveAttribute('tabindex', '4');
            await expect(page.locator('.d-flex')).toHaveCount(0);
        });

        test('restores existing hidden and absent tabindex state', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<input class="visually-hidden existing" id="auth">',
                );
                const auth = $.findOne('#auth');
                UI.AuthCodeInput.init(auth).dispose();
            });

            const auth = page.locator('#auth');
            await expect(auth).toHaveClass('visually-hidden existing');
            await expect(auth).not.toHaveAttribute('tabindex');
        });

        test('removes the AuthCodeInput (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('dispose');
                return $.hasData('#auth', 'authcodeinput');
            })).toBe(false);
        });

        test('removes the AuthCodeInput when the original input is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = $.findOne('#auth');
                const authCodeInput = UI.AuthCodeInput.init(auth);
                const container = $.prev(auth).shift();
                $.remove(auth);
                return !$.isConnected(container) &&
                    authCodeInput.node === null &&
                    authCodeInput.options === null &&
                    !$.isConnected(auth);
            })).toBe(true);

            await expect(page.locator('#auth')).toHaveCount(0);
            await expect(page.locator('.d-flex')).toHaveCount(0);
        });
    });

    test.describe('#clear', () => {
        test('clears the value', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.setValue('123');
                authCodeInput.clear();
            });

            await expect(page.locator('#auth')).toHaveValue('');
            const inputs = page.locator('.d-flex input');
            await expect(inputs).toHaveCount(6);
            for (let index = 0; index < 6; index++) {
                await expect(inputs.nth(index)).toHaveValue('');
            }
        });

        test('clears the value (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('setValue', '123');
                $('#auth').authcodeinput('clear');
            });

            await expect(page.locator('#auth')).toHaveValue('');
        });
    });

    test.describe('#disable', () => {
        test('disables the AuthCodeInput', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.disable();
            });

            await expect(page.locator('#auth')).toBeDisabled();
            await expect(page.locator('.d-flex input:disabled')).toHaveCount(6);
        });

        test('disables the AuthCodeInput (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('disable');
            });

            await expect(page.locator('#auth')).toBeDisabled();
            await expect(page.locator('.d-flex input:disabled')).toHaveCount(6);
        });
    });

    test.describe('#enable', () => {
        test('enables the AuthCodeInput', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(document.body, '<input id="auth" disabled>');
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.enable();
            });

            await expect(page.locator('#auth')).toBeEnabled();
            await expect(page.locator('.d-flex input:enabled')).toHaveCount(6);
        });

        test('enables the AuthCodeInput (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(document.body, '<input id="auth" disabled>');
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('enable');
            });

            await expect(page.locator('#auth')).toBeEnabled();
            await expect(page.locator('.d-flex input:enabled')).toHaveCount(6);
        });
    });

    test.describe('#getValue', () => {
        test('gets the value', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.setValue('1234');
                return authCodeInput.getValue();
            })).toBe('1234');
        });

        test('gets the value (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('setValue', '1234');
                return $('#auth').authcodeinput('getValue');
            })).toBe('1234');
        });
    });

    test.describe('#setValue', () => {
        test('sets the value', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.setValue('1234');
            });

            await expect(page.locator('#auth')).toHaveValue('1234');
            const inputs = page.locator('.d-flex input');
            const values = ['1', '2', '3', '4', '', ''];
            await expect(inputs).toHaveCount(values.length);
            for (const [index, value] of values.entries()) {
                await expect(inputs.nth(index)).toHaveValue(value);
            }
        });

        test('sets the value (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#auth').authcodeinput();
                $('#auth').authcodeinput('setValue', '1234');
            });

            await expect(page.locator('#auth')).toHaveValue('1234');
        });

        test('filters the value', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.setValue('a1b2c3');
            });

            await expect(page.locator('#auth')).toHaveValue('123');
        });

        test('truncates the value to the rendered length', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init(
                    $.findOne('#auth'),
                    { length: 3 },
                );
                authCodeInput.setValue('123456');
            });

            await expect(page.locator('#auth')).toHaveValue('123');
        });
    });

    test.describe('input attributes', () => {
        test('renders autocomplete attributes', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            const inputs = page.locator('.d-flex input');
            await expect(inputs.first()).toHaveAttribute('autocomplete', 'one-time-code');
            await expect(inputs.nth(1)).toHaveAttribute('autocomplete', 'off');
            await expect(page.locator('.d-flex input[maxlength="1"]')).toHaveCount(6);
        });

        test('inherits required and ARIA attributes', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    `
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
                    `,
                );
                UI.AuthCodeInput.init($.findOne('#auth'));
                UI.AuthCodeInput.init($.findOne('#auth2'));
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

    test.describe('events', () => {
        test('triggers a change event when the value changes', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const auth = $.findOne('#auth');
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
                UI.AuthCodeInput.init($.findOne('#auth'));
            });
        });

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

        test('distributes pasted input', async ({ page }) => {
            const allowed = await page.evaluate((_) => {
                const auth = $.findOne('#auth');
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
                const auth = $.findOne('#auth');
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
                const auth = $.findOne('#auth');
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

    test.describe('autoSubmit option', () => {
        test('submits the form when the code is complete', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<form id="form"><input id="auth"><button type="submit">Submit</button></form>',
                );
                window.authCodeInputSubmits = 0;
                $.addEvent('#form', 'submit', (event) => {
                    event.preventDefault();
                    window.authCodeInputSubmits++;
                });
                UI.AuthCodeInput.init(
                    $.findOne('#auth'),
                    { autoSubmit: true, length: 3 },
                );
                const inputs = $.find('input', $.prev('#auth').shift());
                for (const [index, value] of ['1', '2'].entries()) {
                    $.setValue(inputs[index], value);
                    $.triggerEvent(inputs[index], 'input');
                }
            });

            expect(await page.evaluate((_) => window.authCodeInputSubmits)).toBe(0);

            await page.evaluate((_) => {
                const inputs = $.find('input', $.prev('#auth').shift());
                $.setValue(inputs[2], '3');
                $.triggerEvent(inputs[2], 'input');
            });

            expect(await page.evaluate((_) => window.authCodeInputSubmits)).toBe(1);
        });

        test('works with autoSubmit option (data-ui-auto-submit)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    `
                        <form id="form">
                            <input id="auth" data-ui-auto-submit="true" data-ui-length="2">
                        </form>
                    `,
                );
                let submits = 0;
                $.addEvent('#form', 'submit', (event) => {
                    event.preventDefault();
                    submits++;
                });
                UI.AuthCodeInput.init($.findOne('#auth'));
                const inputs = $.find('input', $.prev('#auth').shift());
                for (const [index, value] of ['1', '2'].entries()) {
                    $.setValue(inputs[index], value);
                    $.triggerEvent(inputs[index], 'input');
                }
                return submits;
            })).toBe(1);
        });

        test('does not require a form', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init(
                    $.findOne('#auth'),
                    { autoSubmit: true, length: 2 },
                );
                authCodeInput.setValue('12');
            });

            await expect(page.locator('#auth')).toHaveValue('12');
        });
    });

    test.describe('getAriaLabel option', () => {
        test('renders sequential labels', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            const inputs = page.locator('.d-flex input');
            const labels = [
                'Character 1',
                'Character 2',
                'Character 3',
                'Character 4',
                'Character 5',
                'Character 6',
            ];
            await expect(inputs).toHaveCount(labels.length);
            for (const [index, label] of labels.entries()) {
                await expect(inputs.nth(index)).toHaveAttribute('aria-label', label);
            }
        });

        test('works with getAriaLabel option', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'), {
                    getAriaLabel: (index) => `Digit ${index}`,
                    length: 3,
                });
            });

            const inputs = page.locator('.d-flex input');
            const labels = ['Digit 1', 'Digit 2', 'Digit 3'];
            await expect(inputs).toHaveCount(labels.length);
            for (const [index, label] of labels.entries()) {
                await expect(inputs.nth(index)).toHaveAttribute('aria-label', label);
            }
        });
    });

    test.describe('length option', () => {
        test('renders the default segmented layout', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            const container = page.locator('.d-flex');
            await expect(container).toHaveClass('d-flex justify-content-between');
            await expect(container.locator('.form-input')).toHaveCount(6);
            await expect(container.locator('.vr')).toHaveCount(1);
            await expect(container.locator('input')).toHaveCount(6);
        });

        test('works with length option', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'), { length: [2, 4] });
            });

            const container = page.locator('.d-flex');
            await expect(container.locator(':scope > *')).toHaveCount(7);
            await expect(container.locator(':scope > div.form-input.w-auto')).toHaveCount(6);
            await expect(container.locator(':scope > span.vr.align-self-center.fs-5'))
                .toHaveCount(1);
            await expect(container.locator(':scope > :nth-child(3)'))
                .toHaveClass('vr align-self-center fs-5');
        });

        test('works with length option (data-ui-length)', async ({ page }) => {
            await page.evaluate((_) => {
                $.setDataset('#auth', { uiLength: [2, 2] });
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input')).toHaveCount(4);
            await expect(page.locator('.d-flex .vr')).toHaveCount(1);
        });

        test('limits the layout with maxlength', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute('#auth', { maxlength: 4 });
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input')).toHaveCount(4);
            await expect(page.locator('.d-flex .vr')).toHaveCount(0);
        });

        test('keeps segments when maxlength is longer', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute('#auth', { maxlength: 8 });
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input')).toHaveCount(6);
            await expect(page.locator('.d-flex .vr')).toHaveCount(1);
        });
    });

    test.describe('regExp option', () => {
        test('renders numeric input hints by default', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator(
                '.d-flex input[inputmode="numeric"][pattern="[0-9]"]',
            )).toHaveCount(6);
        });

        test('works with regExp option', async ({ page }) => {
            await page.evaluate((_) => {
                const authCodeInput = UI.AuthCodeInput.init(
                    $.findOne('#auth'),
                    { regExp: '[A-Z]' },
                );
                authCodeInput.setValue('A1B2');
            });

            await expect(page.locator('#auth')).toHaveValue('AB');
            await expect(page.locator(
                '.d-flex input[inputmode="text"][pattern="[A-Z]"]',
            )).toHaveCount(6);
        });

        test('works with regExp option (data-ui-reg-exp)', async ({ page }) => {
            await page.evaluate((_) => {
                $.setDataset('#auth', { uiRegExp: '[A-Z]' });
                const authCodeInput = UI.AuthCodeInput.init($.findOne('#auth'));
                authCodeInput.setValue('A1B2');
            });

            await expect(page.locator('#auth')).toHaveValue('AB');
            await expect(page.locator('.d-flex input[pattern="[A-Z]"]')).toHaveCount(6);
        });

        test('preserves the original inputmode', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute('#auth', { inputmode: 'email' });
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input[inputmode="email"]')).toHaveCount(6);
        });
    });

    test.describe('style option', () => {
        test('renders outline inputs by default', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input').first())
                .toHaveClass('input-outline fw-bold text-center px-0');
        });

        test('works with style option', async ({ page }) => {
            await page.evaluate((_) => {
                UI.AuthCodeInput.init($.findOne('#auth'), { style: 'filled' });
            });

            await expect(page.locator('.d-flex input').first())
                .toHaveClass('input-filled fw-bold text-center px-0');
            await expect(page.locator('.ripple-line')).toHaveCount(0);
        });

        test('works with style option (data-ui-style)', async ({ page }) => {
            await page.evaluate((_) => {
                $.setDataset('#auth', { uiStyle: 'filled' });
                UI.AuthCodeInput.init($.findOne('#auth'));
            });

            await expect(page.locator('.d-flex input').first())
                .toHaveClass('input-filled fw-bold text-center px-0');
        });

        test('renders light and dark theme variants', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    `
                        <section data-ui-theme="light">
                            <input id="light-outline">
                            <input id="light-filled">
                        </section>
                        <section data-ui-theme="dark">
                            <input id="dark-outline">
                            <input id="dark-filled">
                        </section>
                    `,
                );
                for (const id of ['light-outline', 'dark-outline']) {
                    UI.AuthCodeInput.init($.findOne(`#${id}`));
                }
                for (const id of ['light-filled', 'dark-filled']) {
                    UI.AuthCodeInput.init($.findOne(`#${id}`), { style: 'filled' });
                }
            });

            const style = (locator) => locator.evaluate((input) => {
                const computed = getComputedStyle(input);
                return [
                    computed.color,
                    computed.backgroundColor,
                    computed.borderColor,
                ];
            });
            const light = page.locator('[data-ui-theme="light"] .d-flex');
            const dark = page.locator('[data-ui-theme="dark"] .d-flex');

            expect(await style(light.first().locator('input').first()))
                .not.toEqual(await style(dark.first().locator('input').first()));
            expect(await style(light.nth(1).locator('input').first()))
                .not.toEqual(await style(dark.nth(1).locator('input').first()));
        });
    });
});
