import { parseCommit } from 'parse-commit-message';
import * as cct from 'conventional-commit-types';
const commitTypes = Object.keys(cct.types);

export function isSemanticMessage(message: string, requireJira = false) {
	// if a jira is required then ensure that format is followed "ABC-123"
	if (requireJira && !/^[A-Z]+\-\d+\s-\s.*/.test(message)) {
		return { status: false, reason: 'should prepend jira (ex: AB-12 - )' };
	}
	// This targets anything that precedes the type so we can later remove it
	//		^.*\s - look for anything from the begining of the line
	//		(?=) -  as long as it is followed by
	//		([a-z]*(\(|\:))) - any lower case word followed by a ( or :
	const stringBeforeType = new RegExp(/^.*?\s(?=([a-z]*(\(|\:)))/g);
	try {
		const { header } = parseCommit(message.replace(stringBeforeType, ''));
		const { type } = header;
		const hasCorrectType = commitTypes.includes(type);
		return { status: hasCorrectType, reason: hasCorrectType ? '' : `should have valid type (fix: '${type}')` };
	} catch (e) {
		return { status: false, reason: `should be ${requireJira ? 'AB-12 - ' : ''}type(optional scope): subject` };
	}
}
