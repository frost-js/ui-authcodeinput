/**
 * Gets the valid characters from a value.
 * @param {string} value The value to filter.
 * @param {RegExp} regExp The regular expression used to validate each character.
 * @returns {string[]} The valid characters.
 */
export function getValidCharacters(value, regExp) {
    return Array.from(value)
        .filter((char) => char.match(regExp));
}
