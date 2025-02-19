/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import {
	CommonRegistryItem,
	isRegistry,
	isRepository,
	isTag,
} from "@microsoft/vscode-docker-registries";
import * as vscode from "vscode";

import { dockerHubUrl } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../../utils/registryExperience";

export async function openDockerHubInBrowser(
	context: IActionContext,
	node?: UnifiedRegistryItem<CommonRegistryItem>,
): Promise<void> {
	if (!node) {
		node = await registryExperience<CommonRegistryItem>(context, {
			registryFilter: {
				include: [ext.dockerHubRegistryDataProvider.label],
			},
			contextValueFilter: { include: [/commonregistry/i] },
		});
	}

	let url = dockerHubUrl;

	const dockerHubItem = node.wrappedItem;

	if (isRegistry(dockerHubItem)) {
		url = `${url}u/${dockerHubItem.label}`;
	} else if (isRepository(dockerHubItem)) {
		url = `${url}r/${dockerHubItem.parent.label}/${dockerHubItem.label}`;
	} else if (isTag(dockerHubItem)) {
		url = `${url}r/${dockerHubItem.parent.parent.label}/${dockerHubItem.parent.label}/tags`;
	} else {
		throw new Error(
			`Unexpected node type ${dockerHubItem.additionalContextValues || ""}`,
		);
	}

	await vscode.env.openExternal(vscode.Uri.parse(url));
}
