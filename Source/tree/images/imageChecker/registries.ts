/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URL } from "url";
import { ImageNameInfo } from "@microsoft/vscode-container-client";

import { ociClientId } from "../../../constants";
import {
	bearerAuthHeader,
	getWwwAuthenticateContext,
	HttpErrorResponse,
	httpRequest,
	IOAuthContext,
	RequestLike,
	RequestOptionsLike,
} from "../../../utils/httpRequest";
import { NormalizedImageNameInfo } from "../NormalizedImageNameInfo";

export interface ImageRegistry {
	isMatch: (imageNameInfo: ImageNameInfo) => boolean;

	baseUrl: string;

	signRequest?(request: RequestLike, scope: string): Promise<RequestLike>;
}

let dockerHubAuthContext: IOAuthContext | undefined;

export const registries: ImageRegistry[] = [
	{
		isMatch: (imageNameInfo: ImageNameInfo): boolean => {
			const normalizedImageNameInfo = new NormalizedImageNameInfo(
				imageNameInfo,
			);

			return (
				!!imageNameInfo.originalName &&
				normalizedImageNameInfo.normalizedRegistry === "docker.io" &&
				normalizedImageNameInfo.normalizedNamespace === "library"
			);
		},
		baseUrl: "https://registry-1.docker.io/v2/library",
		signRequest: async (
			request: RequestLike,
			scope: string,
		): Promise<RequestLike> => {
			if (!dockerHubAuthContext) {
				try {
					const options: RequestOptionsLike = {
						headers: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							"X-Meta-Source-Client": ociClientId,
						},
					};

					await httpRequest(
						"https://registry-1.docker.io/v2/",
						options,
					);
				} catch (error) {
					if (
						!(error instanceof HttpErrorResponse) ||
						!(dockerHubAuthContext =
							getWwwAuthenticateContext(error))
					) {
						// If it's not an HttpErrorResponse, or getWwwAuthenticateContext came back undefined, rethrow
						throw error;
					}
				}
			}

			const authRequestOptions: RequestOptionsLike = {
				method: "GET",
				headers: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					"X-Meta-Source-Client": ociClientId,
					service: dockerHubAuthContext.service,
					scope: scope,
				},
			};

			const url = new URL(dockerHubAuthContext.realm.toString());

			url.searchParams.append("service", dockerHubAuthContext.service);

			url.searchParams.append("scope", scope);

			const tokenResponse = await httpRequest<{ token: string }>(
				url.toString(),
				authRequestOptions,
			);

			const token = (await tokenResponse.json()).token;

			request.headers.set("Authorization", bearerAuthHeader(token));

			return request;
		},
	},
	{
		isMatch: (imageNameInfo: ImageNameInfo): boolean => {
			return (
				!!imageNameInfo.originalName &&
				imageNameInfo.registry === "mcr.microsoft.com"
			);
		},
		baseUrl: "https://mcr.microsoft.com/v2",
	},
];
