/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	IActionContext,
	TelemetryProperties,
} from "@microsoft/vscode-azext-utils";
import {
	CommonRegistry,
	isRegistry,
} from "@microsoft/vscode-docker-registries";
import * as vscode from "vscode";

import { ext } from "../../extensionVariables";
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { getBaseImagePathFromRegistry } from "../../tree/registries/registryTreeUtils";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function tagImage(
	context: IActionContext,
	node?: ImageTreeItem,
	registry?: UnifiedRegistryItem<CommonRegistry>,
): Promise<string> {
	if (!node) {
		await ext.imagesTree.refresh(context);
		node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(
			ImageTreeItem.contextValue,
			{
				...context,
				noItemFoundErrorMessage: vscode.l10n.t(
					"No images are available to tag",
				),
			},
		);
	}

	addImageTaggingTelemetry(context, node.fullTag, ".before");

	const baseImagePath = isRegistry(registry?.wrappedItem)
		? getBaseImagePathFromRegistry(registry.wrappedItem)
		: undefined;

	const newTaggedName: string = await getTagFromUserInput(
		context,
		node.fullTag,
		baseImagePath,
	);
	addImageTaggingTelemetry(context, newTaggedName, ".after");

	await ext.runWithDefaults((client) =>
		client.tagImage({
			fromImageRef: node.imageId,
			toImageRef: newTaggedName,
		}),
	);

	return newTaggedName;
}

export async function getTagFromUserInput(
	context: IActionContext,
	fullTag: string,
	baseImagePath?: string,
): Promise<string> {
	const opt: vscode.InputBoxOptions = {
		ignoreFocusOut: true,
		prompt: vscode.l10n.t("Tag image as..."),
	};

	if (fullTag.includes("/")) {
		opt.valueSelection = [0, fullTag.lastIndexOf("/")];
	} else if (baseImagePath) {
		fullTag = `${baseImagePath}/${fullTag}`;
		opt.valueSelection = [0, fullTag.lastIndexOf("/")];
	}

	opt.value = fullTag;

	return await context.ui.showInputBox(opt);
}

const KnownRegistries: { type: string; regex: RegExp }[] = [
	// Like username/path
	{ type: "dockerhub-namespace", regex: /^[^.:]+\/[^.:]+$/ },

	{ type: "dockerhub-dockerio", regex: /^docker.io.*\// },
	{ type: "github", regex: /ghcr\.io.*\// },
	{ type: "gitlab", regex: /gitlab.*\// },
	{ type: "ACR", regex: /azurecr\.io.*\// },
	{ type: "GCR", regex: /gcr\.io.*\// },
	{ type: "ECR", regex: /\.ecr\..*\// },
	{ type: "localhost", regex: /localhost:.*\// },

	// Has a port, probably a private registry
	{ type: "privateWithPort", regex: /:[0-9]+\// },

	// Match anything remaining
	{ type: "other", regex: /\// }, // has a slash
	{ type: "none", regex: /./ }, // no slash
];

export function addImageTaggingTelemetry(
	context: IActionContext,
	fullImageName: string,
	propertyPostfix: ".before" | ".after" | "",
): void {
	try {
		const properties: TelemetryProperties = {};

		const [, repository, tag] = /^(.*):(.*)$/.exec(fullImageName) ?? [
			undefined,
			fullImageName,
			"",
		];

		if (
			!!tag.match(
				/^[0-9.-]*(|alpha|beta|latest|edge|v|version)?[0-9.-]*$/,
			)
		) {
			properties.safeTag = tag;
		}
		properties.hasTag = String(!!tag);
		properties.numSlashes = String(numberMatches(repository.match(/\//g)));

		const knownRegistry = KnownRegistries.find(
			(kr) => !!repository.match(kr.regex),
		);

		if (knownRegistry) {
			properties.registryType = knownRegistry.type;
		}

		for (const propertyName of Object.keys(properties)) {
			context.telemetry.properties[propertyName + propertyPostfix] =
				properties[propertyName];
		}
	} catch (error) {
		console.error(error);
	}
}

function numberMatches(matches: RegExpMatchArray | null): number {
	return matches ? matches.length : 0;
}
