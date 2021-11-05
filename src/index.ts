import { Application, Context } from 'probot'; // eslint-disable-line no-unused-vars
import { isSemanticMessage } from './is-semantic-message';

const DEFAULT_OPTS = {
	requireTitle: true,
	requireCommits: 'some',
	requirePrBreakingChangeColon: true,
	requireCommitBreakingChangeColon: true,
	requireJira: true,
	allowedScopes: []
};

async function commitsAreSemantic(context: Context, requireCommits: string, requireJira: boolean, allowedScopes: string[]) {
	// get commits
	const elements = await context.github.pulls.listCommits(
		context.repo({
			number: context.payload.pull_request.number
		})
	);

	// parse commit data
	const commits = elements.data.map((element: any) => element.commit);

	// determine if commits are semantic
	let reason;
	const hasSemanticCommits = commits[requireCommits === 'all' ? 'every' : 'some']((commit: any) => {
		const parsedSemantic = isSemanticMessage(commit.message, requireJira, allowedScopes);
		if (parsedSemantic.status) {
			return true;
		}
		reason = parsedSemantic.reason;
		return false;
	});

	const breakingCommitsHaveColons = commits.every((commit: any) => {
		// if it has a breaking change check to see if there is a colon after
		return commit.message.indexOf('BREAKING CHANGE') > -1 ? commit.message.indexOf('BREAKING CHANGE:') > -1 : true;
	});

	return { hasSemanticCommits: { status: hasSemanticCommits, reason }, breakingCommitsHaveColons };
}

export = (app: Application) => {
	app.on(['pull_request.opened', 'pull_request.edited', 'pull_request.synchronize'], async (context: Context) => {
		let config;
		try {
			config = await context.config('commit-cop.yml', DEFAULT_OPTS);
		} catch (err) {
			config = DEFAULT_OPTS;
		}
		let { requireTitle, requireCommits, requirePrBreakingChangeColon, requireCommitBreakingChangeColon, requireJira, allowedScopes } =
			config;

		// validate options are of correct type or set to default
		if (typeof requireTitle !== 'boolean') {
			requireTitle = DEFAULT_OPTS.requireTitle;
		}
		if (typeof requireCommits !== 'string') {
			requireCommits = DEFAULT_OPTS.requireCommits;
		}
		if (typeof requirePrBreakingChangeColon !== 'boolean') {
			requirePrBreakingChangeColon = DEFAULT_OPTS.requirePrBreakingChangeColon;
		}
		if (typeof requireCommitBreakingChangeColon !== 'boolean') {
			requireCommitBreakingChangeColon = DEFAULT_OPTS.requireCommitBreakingChangeColon;
		}
		if (typeof requireCommitBreakingChangeColon !== 'boolean') {
			requireCommitBreakingChangeColon = DEFAULT_OPTS.requireCommitBreakingChangeColon;
		}
		if (typeof requireJira !== 'boolean') {
			requireJira = DEFAULT_OPTS.requireJira;
		}
		if (!Array.isArray(allowedScopes)) {
			allowedScopes = DEFAULT_OPTS.allowedScopes;
		}

		const { title, head, body = '' } = context.payload.pull_request;
		const hasSemanticTitle = isSemanticMessage(title, requireJira, allowedScopes);
		const { hasSemanticCommits, breakingCommitsHaveColons } = await commitsAreSemantic(
			context,
			requireCommits,
			requireJira,
			allowedScopes
		);

		const breakingPrHasColon = body.indexOf('BREAKING CHANGE') > -1 ? body.indexOf('BREAKING CHANGE:') > -1 : true;

		const isSemantic =
			(hasSemanticTitle.status || !requireTitle) &&
			(hasSemanticCommits.status || requireCommits === 'none') &&
			(breakingPrHasColon || !requirePrBreakingChangeColon) &&
			(breakingCommitsHaveColons || !requireCommitBreakingChangeColon);

		const state = isSemantic ? 'success' : 'failure';

		function getDescription() {
			if (requirePrBreakingChangeColon && !breakingPrHasColon) {
				return '⛔️ Missing colon (:) after BREAKING CHANGE in pull request';
			}
			if (requireCommitBreakingChangeColon && !breakingCommitsHaveColons) {
				return '⛔️ Missing colon (:) after BREAKING CHANGE in some commit';
			}
			if (requireTitle && !hasSemanticTitle.status) {
				return `⛔️ Pull request title ${hasSemanticTitle.reason}`;
			}
			if (requireCommits !== 'none' && !hasSemanticCommits.status) {
				return `⛔️ ${requireCommits === 'all' ? 'All commits' : 'Some commit'} ${hasSemanticCommits.reason}`;
			}
			return `${requireTitle ? '✅ Pull request title' : ''} ${
				requireCommits !== 'none' ? `${requireCommits === 'all' ? '✅ All commits' : '✅ Some commit'}` : ''
			}`;
		}

		const status = {
			sha: head.sha,
			state,
			target_url: 'https://github.com/zieka/commit-cop-bot',
			description: getDescription(),
			context: 'Commit Cop'
		};
		await context.github.repos.createStatus(context.repo(status as any));
	});
};
