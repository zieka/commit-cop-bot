import { parseCommit } from './parse-commit';
import * as cct from 'conventional-commit-types';
const commitTypes = Object.keys(cct.types);

export function isSemanticMessage(message: string, requireJira = false, allowedScopes: string[] = []) {
	// if a jira is required then ensure that format is followed "ABC-123"
	if (requireJira && !/^[A-Z]+\-\d+\s-\s.*/.test(message)) {
		return { status: false, reason: 'should prepend jira (ex: AB-12 - )' };
	}
	/**
	 * This targets anything that precedes the type so we can later remove it
	 *     ^.*\s - look for anything from the begining of the line
	 *     (?=) -  as long as it is followed by
	 *     ([a-z]*(\(|\:))) - any lower case word followed by a ( or :
	 */
	const stringBeforeType = new RegExp(/^.*?\s(?=([a-z]*(\(|\:)))/g);
	try {
		const { header } = parseCommit(message.replace(stringBeforeType, ''));
		const { type, scope } = header;
		const hasCorrectScope = allowedScopes.length === 0 || scope === null || allowedScopes.includes(scope);
		if (!hasCorrectScope) {
			return { status: hasCorrectScope, reason: `should have valid scope (fix: '${scope}')` };
		}
		const hasCorrectType = commitTypes.includes(type);
		return { status: hasCorrectType, reason: hasCorrectType ? '' : `should have valid type (fix: '${type}')` };
	} catch (e) {
		return { status: false, reason: `should be ${requireJira ? 'AB-12 - ' : ''}type(optional scope): subject` };
	}
}
