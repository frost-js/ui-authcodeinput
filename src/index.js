/** @import { AuthCodeInputOptions } from './auth-code-input.js'; */

import { initComponent } from '@fr0st/ui';
import AuthCodeInput from './auth-code-input.js';

/** @type {AuthCodeInputOptions} */
AuthCodeInput.defaults = {
    style: 'outline',
    length: [3, 3],
    regExp: '[0-9]',
    autoSubmit: false,
    getAriaLabel: (i) => `Character ${i}`,
};

AuthCodeInput.classes = {
    container: 'd-flex justify-content-between',
    divider: 'vr align-self-center fs-5',
    hide: 'visually-hidden',
    input: 'fw-bold text-center px-0',
    inputContainer: 'form-input w-auto',
};

initComponent('authcodeinput', AuthCodeInput);

export default AuthCodeInput;
