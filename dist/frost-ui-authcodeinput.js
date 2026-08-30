(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

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
	var AuthCodeInput = class extends _fr0st_ui.BaseComponent {
		#container;
		#inputs;
		#length;
		#regExp;
		#segments;
		/**
		* Creates an AuthCodeInput.
		* @param {HTMLElement} node The input node.
		* @param {AuthCodeInputOptions} [options] The AuthCodeInput options.
		*/
		constructor(node, options) {
			super(node, options);
			this.#segments = _fr0st_query.default._wrap(this.options.length).map((length) => Number.parseInt(length, 10));
			this.#length = this.#segments.reduce((total, length) => total + length, 0);
			const maxLength = Number.parseInt(_fr0st_query.default.getAttribute(this.node, "maxlength"), 10);
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
			_fr0st_query.default.setAttribute(this.node, { disabled: true });
			this.#refreshDisabled();
		}
		/** @inheritdoc */
		dispose() {
			_fr0st_query.default.remove(this.#container);
			_fr0st_query.default.removeAttribute(this.node, "tabindex");
			_fr0st_query.default.removeEvent(this.node, "focus.ui.authcodeinput");
			_fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
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
			_fr0st_query.default.removeAttribute(this.node, "disabled");
			this.#refreshDisabled();
		}
		/**
		* Gets the current value.
		* @returns {string} The current value.
		*/
		getValue() {
			return _fr0st_query.default.getValue(this.node);
		}
		/**
		* Sets the value.
		* @param {string} value The value.
		*/
		setValue(value) {
			_fr0st_query.default.setValue(this.node, value);
			this.#refresh();
		}
		/**
		* Attaches events for the AuthCodeInput.
		*/
		#events() {
			_fr0st_query.default.addEvent(this.node, "focus.ui.authcodeinput", (_) => {
				const nextInput = this.#inputs.find((input) => !_fr0st_query.default.getValue(input));
				_fr0st_query.default.focus(nextInput || this.#inputs[0]);
			});
			_fr0st_query.default.addEventDelegate(this.#container, "focusin.ui.authcodeinput", "input", (e) => {
				const target = e.currentTarget;
				const targetIndex = this.#inputs.indexOf(target);
				const lastIndex = this.#inputs.findLastIndex((input) => _fr0st_query.default.getValue(input));
				if (targetIndex > lastIndex + 1) _fr0st_query.default.focus(this.#inputs[lastIndex + 1]);
				else _fr0st_query.default.select(target);
			});
			_fr0st_query.default.addEventDelegate(this.#container, "input.ui.authcodeinput", "input", (e) => {
				const target = e.currentTarget;
				let value = _fr0st_query.default.getValue(target);
				if (value && !value.match(this.#regExp)) {
					value = "";
					_fr0st_query.default.setValue(target, value);
				}
				this.#updateValue();
				if (!value) return;
				const targetIndex = this.#inputs.indexOf(target);
				if (targetIndex < this.#inputs.length - 1) _fr0st_query.default.focus(this.#inputs[targetIndex + 1]);
			});
			_fr0st_query.default.addEventDelegate(this.#container, "keydown.ui.authcodeinput", "input", (e) => {
				const target = e.currentTarget;
				const targetIndex = this.#inputs.indexOf(target);
				switch (e.code) {
					case "ArrowLeft":
						if (targetIndex > 0) _fr0st_query.default.focus(this.#inputs[targetIndex - 1]);
						break;
					case "ArrowRight":
						if (targetIndex < this.#inputs.length - 1) _fr0st_query.default.focus(this.#inputs[targetIndex + 1]);
						break;
					case "Backspace":
						if (_fr0st_query.default.getValue(target)) {
							_fr0st_query.default.setValue(target, "");
							this.#updateValue();
						} else if (targetIndex > 0) {
							const previousInput = this.#inputs[targetIndex - 1];
							_fr0st_query.default.setValue(previousInput, "");
							this.#updateValue();
							_fr0st_query.default.focus(previousInput);
						}
						break;
					default: if (e.key.length !== 1 || e.key.match(this.#regExp)) return;
				}
				e.preventDefault();
			});
		}
		/**
		* Refreshes the rendered input values.
		*/
		#refresh() {
			const chars = _fr0st_query.default.getValue(this.node).split("");
			for (const input of this.#inputs) {
				let char;
				do
					char = chars.shift();
				while (char && !char.match(this.#regExp));
				_fr0st_query.default.setValue(input, char || "");
			}
			this.#updateValue();
		}
		/**
		* Refreshes the disabled state.
		*/
		#refreshDisabled() {
			if (_fr0st_query.default.is(this.node, ":disabled")) _fr0st_query.default.setAttribute(this.#inputs, { disabled: true });
			else _fr0st_query.default.removeAttribute(this.#inputs, "disabled");
		}
		/**
		* Renders the AuthCodeInput.
		*/
		#render() {
			this.#container = _fr0st_query.default.create("div", { class: this.constructor.classes.container });
			this.#inputs = [];
			let inputIndex = 0;
			for (const [segmentIndex, length] of this.#segments.entries()) {
				if (segmentIndex > 0) {
					const divider = _fr0st_query.default.create("span", { class: this.constructor.classes.divider });
					_fr0st_query.default.append(this.#container, divider);
				}
				for (let i = 0; i < length; i++) {
					const formInput = _fr0st_query.default.create("div", { class: this.constructor.classes.inputContainer });
					const input = _fr0st_query.default.create("input", {
						class: [`input-${this.options.style}`, this.constructor.classes.input],
						attributes: {
							"type": "text",
							"required": true,
							"maxlength": 1,
							"size": 1,
							"pattern": this.options.regExp,
							"autocomplete": "off",
							"aria-label": this.options.getAriaLabel(++inputIndex)
						}
					});
					_fr0st_query.default.append(formInput, input);
					this.#inputs.push(input);
					_fr0st_query.default.append(this.#container, formInput);
				}
			}
			_fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			_fr0st_query.default.setAttribute(this.node, { tabindex: -1 });
			_fr0st_query.default.before(this.node, this.#container);
		}
		/**
		* Updates the underlying input value.
		*/
		#updateValue() {
			const newValue = this.#inputs.map((node) => _fr0st_query.default.getValue(node)).join("");
			const lastIndex = this.#inputs.findLastIndex((input) => _fr0st_query.default.getValue(input));
			for (const [index, input] of this.#inputs.entries()) if (index && index > lastIndex + 1) _fr0st_query.default.setAttribute(input, { tabindex: -1 });
			else _fr0st_query.default.removeAttribute(input, "tabindex");
			if (newValue === this.getValue()) return;
			_fr0st_query.default.setValue(this.node, newValue);
			_fr0st_query.default.triggerEvent(this.node, "change.ui.authcodeinput");
			if (this.options.autoSubmit && newValue.length === this.#length) {
				const form = _fr0st_query.default.closest(this.node, "form").shift();
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
	(0, _fr0st_ui.initComponent)("authcodeinput", AuthCodeInput);
	var src_default = AuthCodeInput;

//#endregion
exports.AuthCodeInput = src_default;
});
//# sourceMappingURL=frost-ui-authcodeinput.js.map