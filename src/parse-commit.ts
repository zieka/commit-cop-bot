import { EOL } from 'os';

const errorMsg = `parse-commit-message: expect \`commit\` to follow:
<type>[optional scope]: <description>

[optional body]

[optional footer]`;
function isValidString(x) {
	return Boolean(typeof x === 'string' && x.length > 0);
}

function parseHeader(header) {
	if (!isValidString(header)) {
		throw new TypeError('expect `header` to be non empty string');
	}

	const parts = header.split(EOL);
	// eslint-disable-next-line no-param-reassign
	header = parts.length > 1 ? parts[0] : header;

	// because the last question mark, which we totally need
	// eslint-disable-next-line unicorn/no-unsafe-regex
	const regex = /^(\w+)(?:\((.+)\))?: (.+)$/i;
	if (!regex.test(header)) {
		throw new TypeError(errorMsg);
	}
	const [type, scope = null, subject] = regex.exec(header)!.slice(1);

	return { type, scope, subject };
}

export function parseCommit(commit) {
	if (!isValidString(commit)) {
		throw new TypeError(`expect \`commit\` to be non empty string`);
	}

	const header = parseHeader(commit);
	const [body = null, footer = null] = commit.split('\n\n').slice(1);

	return { header, body, footer };
}
