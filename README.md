# Frost UI AuthCodeInput

[![CI](https://github.com/frost-js/ui-authcodeinput/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-authcodeinput/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-authcodeinput/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-authcodeinput)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-authcodeinput?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-authcodeinput)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-authcodeinput?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-authcodeinput)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-authcodeinput/main/dist/frost-ui-authcodeinput.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-authcodeinput/blob/main/dist/frost-ui-authcodeinput.min.js)
[![license](https://img.shields.io/github/license/frost-js/ui-authcodeinput?style=flat-square)](./LICENSE)

Segmented authentication-code input for Frost UI with filtering, keyboard navigation, paste distribution, accessibility attributes, and optional form submission.

## Highlights

- Configurable character count or divided segment layout
- Numeric codes by default, with custom per-character regular expressions
- Multi-character paste and one-time-code autofill distribution
- Arrow-key navigation, backspace synchronization, focus redirection, and managed tab order
- Native Ctrl/Cmd shortcuts and read-only input support
- Silent programmatic updates and form-reset synchronization
- Outline and filled Frost UI v4 input styles
- System-aware light and dark themes with RTL behavior
- Native `AuthCodeInput` class and `authcodeinput` fQuery plugin
- Prebuilt ESM and UMD bundles with source maps
- No component-specific CSS or Sass
- JSDoc-powered IntelliSense

## Installation

### Browser projects / bundlers

Install AuthCodeInput with its Frost UI v4 and fQuery v5 peers:

```bash
npm i @fr0st/ui-authcodeinput @fr0st/ui @fr0st/query
```

The package root resolves to the compiled ESM bundle. Import the Frost UI stylesheet and the default component export:

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import AuthCodeInput from '@fr0st/ui-authcodeinput';

const authCodeInput = AuthCodeInput.init(
    document.querySelector('#verification-code'),
    {
        autoSubmit: true,
        length: [3, 3],
    },
);
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's UI and fQuery instances. The package root, `dist/*`, and `src/*` are available through package exports.

AuthCodeInput requires a browser DOM or a compatible DOM environment configured through fQuery. Server-rendered applications should load the component on the client.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. Frost UI and fQuery also require `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">

<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import AuthCodeInput from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-authcodeinput@latest/dist/frost-ui-authcodeinput.esm.min.js';

    AuthCodeInput.init(document.querySelector('#verification-code'));
</script>
```

### Browser (UMD)

Load Frost UI's all-in-one bundle before AuthCodeInput. The UI bundle supplies both the `UI` and `fQuery` globals expected by the component:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-authcodeinput@latest/dist/frost-ui-authcodeinput.min.js"></script>
<script>
    const authCodeInput = UI.AuthCodeInput.init(
        document.querySelector('#verification-code'),
    );
</script>
```

The UMD bundle adds `AuthCodeInput` to the existing `globalThis.UI` object. It expects `globalThis.UI` and `globalThis.fQuery` to exist before it loads. If the non-bundled Frost UI build is used instead, load fQuery, Frost UI, and AuthCodeInput in that order.

Do not load the separate fQuery script when using `frost-ui-bundle.js` or `frost-ui-bundle.min.js`.

## Usage

Start with a normal input. AuthCodeInput inserts the visible character inputs before it and keeps the original input synchronized for form submission:

```html
<form id="verification-form">
    <label for="verification-code">Verification code</label>
    <input
        id="verification-code"
        name="verificationCode"
        inputmode="numeric"
        maxlength="6"
        required>

    <button class="btn btn-primary" type="submit">Verify</button>
</form>
```

```js
import AuthCodeInput from '@fr0st/ui-authcodeinput';

const authCodeInput = AuthCodeInput.init(
    document.querySelector('#verification-code'),
    {
        length: [3, 3],
        style: 'outline',
    },
);

console.log(authCodeInput.getValue());
```

Calling `AuthCodeInput.init()` again for the same input returns its existing instance. Dispose the current instance before reinitializing the input with different options.

## Options

Options are resolved in this order:

1. Component defaults
2. The input's `data-ui-*` attributes
3. Options passed to `AuthCodeInput.init()`

Resolved `instance.options` are frozen.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `autoSubmit` | `boolean` | `false` | Submit the original input's associated form when user input completes the code. |
| `getAriaLabel` | `(index: number) => string` | ``(index) => `Character ${index}` `` | Create the accessible label for each generated input. The index starts at `1`. |
| `length` | `number \| number[]` | `[3, 3]` | Set the total character count or the character counts for divided segments. |
| `regExp` | `string` | `'[0-9]'` | Regular-expression source used to accept or reject each character. |
| `style` | `'filled' \| 'outline'` | `'outline'` | Select the Frost UI input style. |

A numeric `length` renders one uninterrupted group. An array inserts a vertical rule between segments. If the original input has a shorter valid `maxlength`, that value caps the rendered character count and produces one group.

```js
const authCodeInput = AuthCodeInput.init(node, {
    autoSubmit: false,
    getAriaLabel: (index) => `Verification digit ${index}`,
    length: [2, 2, 2],
    regExp: '[A-Z0-9]',
    style: 'filled',
});
```

## Data attributes

Options other than `getAriaLabel` can be supplied through `data-ui-*` attributes:

| Attribute | Example |
| --- | --- |
| `data-ui-auto-submit` | `data-ui-auto-submit="true"` |
| `data-ui-length` | `data-ui-length="[3, 3]"` |
| `data-ui-reg-exp` | `data-ui-reg-exp="[A-Z0-9]"` |
| `data-ui-style` | `data-ui-style="filled"` |

```html
<input
    id="verification-code"
    name="verificationCode"
    data-ui-toggle="authcodeinput"
    data-ui-auto-submit="true"
    data-ui-length="[3, 3]"
    data-ui-reg-exp="[0-9]"
    data-ui-style="filled">
```

The component still needs to be initialized through the class or fQuery plugin. The demo uses `data-ui-toggle="authcodeinput"` as a shared initialization selector:

```js
$('[data-ui-toggle="authcodeinput"]').authcodeinput();
```

The `data-ui-toggle` attribute does not initialize AuthCodeInput by itself.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `AuthCodeInput.init(node, options?)` | `AuthCodeInput` | Return the existing instance for an input or create one. |
| `clear()` | `void` | Clear the original and generated inputs. |
| `disable()` | `void` | Disable the original and generated inputs. |
| `dispose()` | `void` | Remove generated markup and registered state, then restore the original input. |
| `enable()` | `void` | Enable the original and generated inputs. |
| `getValue()` | `string` | Return the synchronized value from the original input. |
| `setValue(value)` | `void` | Filter, truncate, and distribute a value across the generated inputs. |

```js
authCodeInput.setValue('123456');
console.log(authCodeInput.getValue()); // "123456"

authCodeInput.clear();
authCodeInput.disable();
authCodeInput.enable();
authCodeInput.dispose();
```

An instance also exposes its original input as `instance.node` and its frozen resolved configuration as `instance.options`. Both become `null` after disposal.

## Events

AuthCodeInput emits one namespaced fQuery event from the original input when user interaction changes the synchronized value:

| Event | Description |
| --- | --- |
| `change.ui.authcodeinput` | The generated character inputs produced a new value. |

```js
import $ from '@fr0st/query';

$.addEvent(
    '#verification-code',
    'change.ui.authcodeinput',
    (event) => {
        console.log(event.currentTarget.value);
    },
);
```

The underlying native event type is `change`; fQuery exposes `event.namespace` as `ui.authcodeinput`. Re-entering the same value does not emit another event. Initialization, programmatic `setValue()` and `clear()`, and form-reset synchronization do not emit a change event or automatically submit the form, including when values are filtered or truncated.

Calling `dispose()` from a change listener is supported. The component stops further automatic submission and focus handling after that callback.

## fQuery API

Importing AuthCodeInput registers `authcodeinput` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-authcodeinput';

const authCodeInput = $('#verification-code').authcodeinput({
    length: [3, 3],
});

$('#verification-code').authcodeinput('setValue', '123456');

const value = $('#verification-code').authcodeinput('getValue');

$('#verification-code').authcodeinput('clear');
$('#verification-code').authcodeinput('disable');
$('#verification-code').authcodeinput('enable');
$('#verification-code').authcodeinput('dispose');
```

Pass an options object to initialize every matched input, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

- Generated inputs receive sequential labels from `getAriaLabel(index)`.
- The first generated input uses `autocomplete="one-time-code"`; remaining inputs use `autocomplete="off"`.
- `aria-describedby`, `aria-errormessage`, `aria-invalid`, and `aria-required` are copied from the original input.
- Native `required` state is copied only when the original input is required.
- At initialization, `readonly` is copied to the generated inputs. Read-only inputs remain selectable and support copying and navigation; typing, paste, and backspace cannot change their values. Programmatic `setValue()` and `clear()` still work.
- Native Ctrl/Cmd keyboard shortcuts are preserved. Pasted characters still pass through the configured filter.
- The original `inputmode` is preserved. Without one, the default `[0-9]` expression uses `numeric`; other expressions use `text`.
- Focus is redirected to the next incomplete input, and unavailable future positions are removed from the tab order.
- The original input remains the submitted form field and is visually hidden while the component is active.
- Disposal restores the original input's pre-existing hidden state and `tabindex` while preserving its other classes.

Applications remain responsible for meaningful labels, instructions, error messages, and validation feedback. Use `getAriaLabel` when “Character 1” through “Character N” is not appropriate for the surrounding language or context.

## Form submission

Set `autoSubmit: true` to call `requestSubmit()` on the original input's associated form when user input or paste completes the code:

```js
AuthCodeInput.init(document.querySelector('#verification-code'), {
    autoSubmit: true,
    length: 6,
});
```

`requestSubmit()` follows the form's normal validation and submit-event path. The associated form is taken from the original input's `form` property at initialization, including a form linked through the HTML `form` attribute. Nothing is submitted when the input has no associated form. Dispose and reinitialize the component if you change its form association.

The change event runs before automatic submission. Submission proceeds only if the instance remains active and its value still matches the completed code after change listeners have run. A listener that clears the code, leaves a different value, or disposes the component prevents that automatic submission.

Programmatic `setValue()` and `clear()` never automatically submit the form, even when filtering or truncation produces a complete code.

## Form reset

Calling the associated form's `reset()` method or activating a reset button restores the original input's default value. AuthCodeInput then filters and distributes that value across the generated inputs and updates their tab order.

Synchronization is deferred until after the browser finishes resetting the form, so the generated inputs are updated asynchronously. It does not emit a change event or automatically submit the form. Canceled resets are ignored, and disposal removes the reset listener and prevents pending refreshes from running.

## Themes and RTL

AuthCodeInput uses Frost UI's form, flex, spacing, typography, vertical-rule, and visibility utilities. It does not ship a separate stylesheet.

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly:

```html
<section data-ui-theme="dark">
    <input id="verification-code" data-ui-style="filled">
</section>
```

Normal document and ancestor direction is respected. A `dir` attribute placed directly on the original input is also copied to the generated container:

```html
<input id="verification-code" dir="rtl">
```

In RTL layouts, the visual order reverses and Arrow Left/Arrow Right continue to move in their physical screen directions.

## Development

Use Node.js matching `^20.19.0 || ^22.13.0 || >=24`. Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds JavaScript, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

## License

Frost UI AuthCodeInput is released under the [MIT License](./LICENSE).
