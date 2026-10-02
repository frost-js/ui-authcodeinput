const $ = globalThis.fQuery;
const UI = globalThis.UI;
const themeKey = 'frostui-authcodeinput-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    $('[data-ui-toggle="authcodeinput"]').authcodeinput();

    $.addEvent('#methods-code', 'change.ui.authcodeinput', (event) => {
        logEvent(`change.ui.authcodeinput — value: "${$.getValue(event.currentTarget)}"`);
    });

    $('[data-demo-method]').addEvent('click', (event) => {
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const instance = method === 'dispose' ?
            $.getData('#methods-code', 'authcodeinput') :
            UI.AuthCodeInput.init($.findOne('#methods-code'));

        switch (method) {
            case 'init':
                $.setText('#method-output', 'Initialized.');
                break;
            case 'dispose':
                if (instance) {
                    instance.dispose();
                    $.setText('#method-output', 'Disposed; the original input is restored.');
                } else {
                    $.setText('#method-output', 'Already disposed.');
                }
                break;
            case 'enable':
                instance.enable();
                $.setText('#method-output', 'Enabled.');
                break;
            case 'disable':
                instance.disable();
                $.setText('#method-output', 'Disabled.');
                break;
            case 'setValue':
                instance.setValue('314159');
                $.setText('#method-output', 'Value set to 314159.');
                break;
            case 'getValue':
                $.setText('#method-output', `Current value: "${instance.getValue()}"`);
                break;
            case 'clear':
                instance.clear();
                $.setText('#method-output', 'Cleared.');
                break;
        }
    });

    let submitCount = 0;

    $.addEvent('#auto-submit-form', 'submit', (event) => {
        event.preventDefault();
        submitCount++;
        $.setText(
            '#auto-submit-status',
            `Submit event ${submitCount} received with value "${$.getValue('#auto-submit-code')}".`,
        );
    });

    $.addEvent('#auto-submit-clear', 'click', () => {
        $.getData('#auto-submit-code', 'authcodeinput').clear();
        $.setText('#auto-submit-status', 'Cleared. Enter another complete code.');
        $.focus('#auto-submit-code');
    });

    $.addEvent('#copy-otp', 'copied.ui.clipboard', () => {
        $.setText(
            '#copy-otp-status',
            'Copied 739204. Focus the first character field and paste.',
        );
    });
});
