/**
 * WebMCP (https://github.com/webmachinelearning/webmcp): a page hands an AI
 * agent in the browser tools it can call. TypeScript's DOM types do not have
 * it yet, so the part the site uses is typed here.
 */

/** Hints for the agent; each is false when left out. */
export type ToolAnnotations = {
	/** It only reads: it changes nothing on the page or anywhere else. */
	readOnlyHint?: boolean;
	/** What it returns comes from outside the site (people's words, other sites). */
	untrustedContentHint?: boolean;
	/** It does something the user would want to confirm first (buys, sends, deletes). */
	consequentialHint?: boolean;
};

/** A JSON Schema for a tool's input: an object, and nothing that does not survive JSON. */
export type InputSchema = {
	type: 'object';
	properties: Record<string, unknown>;
	required?: string[];
	additionalProperties?: boolean;
};

export type ModelContextTool = {
	/** 1–128 ASCII letters, digits, "_", "-" or "."; the site's are snake_case. */
	name: string;
	/** Shown to the user. */
	title?: string;
	/** What it does and when to use it, for the agent. */
	description: string;
	inputSchema?: InputSchema;
	/**
	 * Its result goes to the agent as JSON; a rejection reaches it only as an
	 * OperationError (the message stays here). Called with `{}` when the
	 * agent gives no input.
	 */
	execute: (
		input: Record<string, unknown>,
		client?: { signal?: AbortSignal },
	) => Promise<unknown>;
	annotations?: ToolAnnotations;
};

export type ModelContext = {
	/**
	 * Adds a tool until `signal` aborts. Rejects when the name is taken (or
	 * empty, or has other characters), the description is empty, or the page
	 * may not have tools. Chrome's earlier preview returned nothing, and threw.
	 */
	registerTool: (
		tool: ModelContextTool,
		options?: { signal?: AbortSignal },
	) => Promise<undefined> | undefined;
	/** Chrome's earlier preview took a tool away by name; the spec aborts its signal instead. */
	unregisterTool?: (name: string) => void;
};

/** Where the browser puts it: `document.modelContext`, and `navigator.modelContext` in Chrome's earlier preview. */
export type WithModelContext = { modelContext?: ModelContext };
