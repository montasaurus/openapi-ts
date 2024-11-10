/* eslint-disable simple-import-sort/exports */
import type { FetchRequestInit } from "expo/fetch";

import type { Client, Config, RequestOptions } from "./types";
import {
	createConfig,
	createQuerySerializer,
	getParseAs,
	getUrl,
	mergeConfigs,
	mergeHeaders,
} from "./utils";

export const createClient = (config: Config = {}): Client => {
	let _config = mergeConfigs(createConfig(), config);

	const getConfig = (): Config => ({ ..._config });

	const setConfig = (config: Config): Config => {
		_config = mergeConfigs(_config, config);
		return getConfig();
	};

	// @ts-expect-error
	const request: Client["request"] = async (options) => {
		// @ts-expect-error
		const opts: RequestOptions = {
			..._config,
			...options,
			headers: mergeHeaders(_config.headers, options.headers),
		};
		if (opts.body && opts.bodySerializer) {
			opts.body = opts.bodySerializer(opts.body);
		}

		// remove Content-Type header if body is empty to avoid sending invalid requests
		if (!opts.body) {
			opts.headers.delete("Content-Type");
		}

		const url = getUrl({
			baseUrl: opts.baseUrl ?? "",
			path: opts.path,
			query: opts.query,
			querySerializer:
				typeof opts.querySerializer === "function"
					? opts.querySerializer
					: createQuerySerializer(opts.querySerializer),
			url: opts.url,
		});

		const request: FetchRequestInit = {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			body: opts.body as any,
			credentials: opts.credentials,
			headers: opts.headers,
			method: opts.method,
			signal: opts.signal,
		};

		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const _fetch = opts.fetch!;
		const response = await _fetch(url, request);

		const result = {
			request,
			response,
		};

		if (response.ok) {
			if (
				response.status === 204 ||
				response.headers.get("Content-Length") === "0"
			) {
				return {
					data: {},
					...result,
				};
			}

			if (opts.parseAs === "stream") {
				return {
					data: response.body,
					...result,
				};
			}

			const parseAs =
				(opts.parseAs === "auto"
					? getParseAs(response.headers.get("Content-Type"))
					: opts.parseAs) ?? "json";

			let data = await response[parseAs]();
			if (parseAs === "json" && opts.responseTransformer) {
				data = await opts.responseTransformer(data);
			}

			return {
				data,
				...result,
			};
		}

		let error = await response.text();

		try {
			error = JSON.parse(error);
		} catch {
			// noop
		}

		let finalError = error;

		finalError = finalError || ({} as string);

		if (opts.throwOnError) {
			throw finalError;
		}

		return {
			error: finalError,
			...result,
		};
	};

	return {
		connect: (options) => request({ ...options, method: "CONNECT" }),
		delete: (options) => request({ ...options, method: "DELETE" }),
		get: (options) => request({ ...options, method: "GET" }),
		getConfig,
		head: (options) => request({ ...options, method: "HEAD" }),
		options: (options) => request({ ...options, method: "OPTIONS" }),
		patch: (options) => request({ ...options, method: "PATCH" }),
		post: (options) => request({ ...options, method: "POST" }),
		put: (options) => request({ ...options, method: "PUT" }),
		request,
		setConfig,
		trace: (options) => request({ ...options, method: "TRACE" }),
	};
};

export type {
	Client,
	Config,
	Options,
	RequestOptionsBase,
	RequestResult,
} from "./types";
export {
	createConfig,
	formDataBodySerializer,
	jsonBodySerializer,
	urlSearchParamsBodySerializer,
	type QuerySerializerOptions,
} from "./utils";
