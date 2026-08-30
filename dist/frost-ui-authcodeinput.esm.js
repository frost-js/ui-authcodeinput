import { BaseComponent, initComponent } from "@fr0st/ui";
import $ from "@fr0st/query";

//#region src/auth-code-input.js
/**
* @typedef {object} AuthCodeInputOptions
* @property {boolean} [autoSubmit=false] Whether to submit the containing form when the code is complete.
* @property {((index: number) => string)} [getAriaLabel] Generates the accessible label for a character input.
* @property {number|number[]} [length] The character count, or the character counts for divided segments.
* @property {string} [regExp='[0-9]'] The regular expression used to validate each character.
* @property {'filled'|'outline'} [style='outline'] The Frost UI input style.
*/
/**
* Controls a segmented authentication code input.
* @augments {BaseComponent<AuthCodeInputOptions>}
*/
var AuthCodeInput = class extends BaseComponent {
	#container;
	#hidden;
	#inputs;
	#length;
	#regExp;
	#segments;
	#tabIndex;
	/**
	* Creates an AuthCodeInput.
	* @param {HTMLElement} node The input node.
	* @param {AuthCodeInputOptions} [options] The AuthCodeInput options.
	*/
	constructor(node, options) {
		super(node, options);
		this.#segments = $._wrap(this.options.length).map((length) => Number.parseInt(length, 10));
		this.#length = this.#segments.reduce((total, length) => total + length, 0);
		const maxLength = Number.parseInt($.getAttribute(this.node, "maxlength"), 10);
		if (Number.isInteger(maxLength) && maxLength >= 0 && this.#length > maxLength) {
			this.#length = maxLength;
			this.#segments = [maxLength];
		}
		this.#regExp = new RegExp(this.options.regExp);
		this.#render();
		this.#events();
		this.#refresh();
		this.#refreshDisabled();
		this.#updateValue();
	}
	/**
	* Clears the AuthCodeInput.
	*/
	clear() {
		this.setValue("");
	}
	/**
	* Disables the AuthCodeInput.
	*/
	disable() {
		$.setAttribute(this.node, { disabled: true });
		this.#refreshDisabled();
	}
	/** @inheritdoc */
	dispose() {
		$.remove(this.#container);
		$.removeEvent(this.node, "focus.ui.authcodeinput");
		if (this.#hidden) $.addClass(this.node, this.constructor.classes.hide);
		else $.removeClass(this.node, this.constructor.classes.hide);
		if (this.#tabIndex === null) $.removeAttribute(this.node, "tabindex");
		else $.setAttribute(this.node, { tabindex: this.#tabIndex });
		this.#container = null;
		this.#inputs = null;
		this.#regExp = null;
		this.#segments = null;
		super.dispose();
	}
	/**
	* Enables the AuthCodeInput.
	*/
	enable() {
		$.removeAttribute(this.node, "disabled");
		this.#refreshDisabled();
	}
	/**
	* Gets the current value.
	* @returns {string} The current value.
	*/
	getValue() {
		return $.getValue(this.node);
	}
	/**
	* Sets the value.
	* @param {string} value The value.
	*/
	setValue(value) {
		$.setValue(this.node, value);
		this.#refresh();
	}
	/**
	* Distributes a value across the rendered inputs.
	* @param {string} value The value to distribute.
	* @param {number} startIndex The first input index.
	* @returns {boolean} Whether any valid characters were distributed.
	*/
	#distributeValue(value, startIndex) {
		const chars = this.#getValidCharacters(value).slice(0, this.#inputs.length - startIndex);
		if (!chars.length) return false;
		for (const [offset, char] of chars.entries()) $.setValue(this.#inputs[startIndex + offset], char);
		this.#updateValue();
		const focusIndex = Math.min(startIndex + chars.length, this.#inputs.length - 1);
		$.focus(this.#inputs[focusIndex]);
		return true;
	}
	/**
	* Attaches events for the AuthCodeInput.
	*/
	#events() {
		$.addEvent(this.node, "focus.ui.authcodeinput", (_) => {
			const nextInput = this.#inputs.find((input) => !$.getValue(input));
			$.focus(nextInput || this.#inputs[0]);
		});
		$.addEventDelegate(this.#container, "focusin.ui.authcodeinput", "input", (e) => {
			const target = e.currentTarget;
			const targetIndex = this.#inputs.indexOf(target);
			const lastIndex = this.#inputs.findLastIndex((input) => $.getValue(input));
			if (targetIndex > lastIndex + 1) $.focus(this.#inputs[lastIndex + 1]);
			else $.select(target);
		});
		$.addEventDelegate(this.#container, "input.ui.authcodeinput", "input", (e) => {
			const target = e.currentTarget;
			const targetIndex = this.#inputs.indexOf(target);
			let value = $.getValue(target);
			if (Array.from(value).length > 1) {
				if (!this.#distributeValue(value, targetIndex)) {
					$.setValue(target, "");
					this.#updateValue();
				}
				return;
			}
			if (value && !this.#getValidCharacters(value).length) {
				value = "";
				$.setValue(target, value);
			}
			this.#updateValue();
			if (!value) return;
			if (targetIndex < this.#inputs.length - 1) $.focus(this.#inputs[targetIndex + 1]);
		});
		$.addEventDelegate(this.#container, "paste.ui.authcodeinput", "input", (e) => {
			const value = e.clipboardData.getData("text");
			e.preventDefault();
			this.#distributeValue(value, this.#inputs.indexOf(e.currentTarget));
		});
		$.addEventDelegate(this.#container, "keydown.ui.authcodeinput", "input", (e) => {
			const target = e.currentTarget;
			const targetIndex = this.#inputs.indexOf(target);
			switch (e.code) {
				case "ArrowLeft": {
					const nextIndex = targetIndex + ($.css(this.#container, "direction") === "rtl" ? 1 : -1);
					if (nextIndex < 0 || nextIndex >= this.#inputs.length) return;
					$.focus(this.#inputs[nextIndex]);
					break;
				}
				case "ArrowRight": {
					const nextIndex = targetIndex + ($.css(this.#container, "direction") === "rtl" ? -1 : 1);
					if (nextIndex < 0 || nextIndex >= this.#inputs.length) return;
					$.focus(this.#inputs[nextIndex]);
					break;
				}
				case "Backspace":
					if ($.getValue(target)) {
						$.setValue(target, "");
						this.#updateValue();
					} else if (targetIndex > 0) {
						const previousInput = this.#inputs[targetIndex - 1];
						$.setValue(previousInput, "");
						this.#updateValue();
						$.focus(previousInput);
					}
					break;
				default: if (e.key.length !== 1 || e.key.match(this.#regExp)) return;
			}
			e.preventDefault();
		});
	}
	/**
	* Gets the valid characters from a value.
	* @param {string} value The value to filter.
	* @returns {string[]} The valid characters.
	*/
	#getValidCharacters(value) {
		return Array.from(value).filter((char) => char.match(this.#regExp));
	}
	/**
	* Refreshes the rendered input values.
	*/
	#refresh() {
		const chars = $.getValue(this.node).split("");
		for (const input of this.#inputs) {
			let char;
			do
				char = chars.shift();
			while (char && !char.match(this.#regExp));
			$.setValue(input, char || "");
		}
		this.#updateValue();
	}
	/**
	* Refreshes the disabled state.
	*/
	#refreshDisabled() {
		if ($.is(this.node, ":disabled")) $.setAttribute(this.#inputs, { disabled: true });
		else $.removeAttribute(this.#inputs, "disabled");
	}
	/**
	* Renders the AuthCodeInput.
	*/
	#render() {
		this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
		this.#tabIndex = $.getAttribute(this.node, "tabindex");
		const containerOptions = { class: this.constructor.classes.container };
		const direction = $.getAttribute(this.node, "dir");
		if (direction) containerOptions.attributes = { dir: direction };
		this.#container = $.create("div", containerOptions);
		this.#inputs = [];
		const inputMode = $.getAttribute(this.node, "inputmode") || (this.options.regExp === "[0-9]" ? "numeric" : "text");
		const required = $.is(this.node, ":required");
		const inheritedAttributes = Object.fromEntries([
			"aria-describedby",
			"aria-errormessage",
			"aria-invalid",
			"aria-required"
		].map((attribute) => [attribute, $.getAttribute(this.node, attribute)]).filter(([, value]) => value !== null));
		let inputIndex = 0;
		for (const [segmentIndex, length] of this.#segments.entries()) {
			if (segmentIndex > 0) {
				const divider = $.create("span", { class: this.constructor.classes.divider });
				$.append(this.#container, divider);
			}
			for (let i = 0; i < length; i++) {
				const attributes = {
					...inheritedAttributes,
					"type": "text",
					"maxlength": 1,
					"size": 1,
					"pattern": this.options.regExp,
					"inputmode": inputMode,
					"autocomplete": inputIndex ? "off" : "one-time-code",
					"aria-label": this.options.getAriaLabel(++inputIndex)
				};
				if (required) attributes.required = "";
				const formInput = $.create("div", { class: this.constructor.classes.inputContainer });
				const input = $.create("input", {
					class: [`input-${this.options.style}`, this.constructor.classes.input],
					attributes
				});
				$.append(formInput, input);
				this.#inputs.push(input);
				$.append(this.#container, formInput);
			}
		}
		$.addClass(this.node, this.constructor.classes.hide);
		$.setAttribute(this.node, { tabindex: -1 });
		$.before(this.node, this.#container);
	}
	/**
	* Updates the underlying input value.
	*/
	#updateValue() {
		const newValue = this.#inputs.map((node) => $.getValue(node)).join("");
		const lastIndex = this.#inputs.findLastIndex((input) => $.getValue(input));
		for (const [index, input] of this.#inputs.entries()) if (index && index > lastIndex + 1) $.setAttribute(input, { tabindex: -1 });
		else $.removeAttribute(input, "tabindex");
		if (newValue === this.getValue()) return;
		$.setValue(this.node, newValue);
		$.triggerEvent(this.node, "change.ui.authcodeinput");
		if (this.options.autoSubmit && newValue.length === this.#length) {
			const form = $.closest(this.node, "form").shift();
			if (form) form.requestSubmit();
		}
	}
};

//#endregion
//#region src/index.js
/** @import { AuthCodeInputOptions } from './auth-code-input.js'; */
/** @type {AuthCodeInputOptions} */
AuthCodeInput.defaults = {
	style: "outline",
	length: [3, 3],
	regExp: "[0-9]",
	autoSubmit: false,
	getAriaLabel: (i) => `Character ${i}`
};
AuthCodeInput.classes = {
	container: "d-flex justify-content-between",
	divider: "vr align-self-center fs-5",
	hide: "visually-hidden",
	input: "fw-bold text-center px-0",
	inputContainer: "form-input w-auto"
};
initComponent("authcodeinput", AuthCodeInput);
var src_default = AuthCodeInput;

//#endregion
export { src_default as default };
//# sourceMappingURL=frost-ui-authcodeinput.esm.js.map