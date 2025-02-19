/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import {
	CommonTag,
	RegistryV2DataProvider,
} from "@microsoft/vscode-docker-registries";
import * as vscode from "vscode";

import { ext } from "../../extensionVariables";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../utils/registryExperience";

export async function copyRemoteImageDigest(
	context: IActionContext,
	node?: UnifiedRegistryItem<CommonTag>,
): Promise<void> {
	if (!node) {
		node = await registryExperience<CommonTag>(context, {
			registryFilter: {
				exclude: [ext.dockerHubRegistryDataProvider.label],
			},
			contextValueFilter: { include: /commontag/i },
		});
	}

	const v2DataProvider = node.provider as unknown as RegistryV2DataProvider;

	const digest = await v2DataProvider.getImageDigest(node.wrappedItem);

	void vscode.env.clipboard.writeText(digest);
}
