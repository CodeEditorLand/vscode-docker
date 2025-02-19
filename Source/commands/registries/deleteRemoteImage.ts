/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	DialogResponses,
	IActionContext,
	parseError,
	UserCancelledError,
} from "@microsoft/vscode-azext-utils";
import {
	CommonRegistryDataProvider,
	CommonTag,
} from "@microsoft/vscode-docker-registries";
import { l10n, ProgressLocation, window } from "vscode";

import { ext } from "../../extensionVariables";
import { getImageNameFromRegistryTagItem } from "../../tree/registries/registryTreeUtils";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../utils/registryExperience";

export async function deleteRemoteImage(
	context: IActionContext,
	node?: UnifiedRegistryItem<CommonTag>,
): Promise<void> {
	if (!node) {
		node = await registryExperience<CommonTag>(context, {
			registryFilter: {
				exclude: [
					ext.githubRegistryDataProvider.label,
					ext.dockerHubRegistryDataProvider.label,
				],
			},
			contextValueFilter: { include: /commontag/i },
		});
	}

	const provider = node.provider as unknown as CommonRegistryDataProvider;

	if (typeof provider.deleteTag !== "function") {
		throw new Error(
			l10n.t("Deleting remote images is not supported on this registry."),
		);
	}

	const tagName = getImageNameFromRegistryTagItem(node.wrappedItem);

	const confirmDelete = l10n.t(
		'Are you sure you want to delete image "{0}"? This will delete all images that have the same digest.',
		tagName,
	);
	// no need to check result - cancel will throw a UserCancelledError
	await context.ui.showWarningMessage(
		confirmDelete,
		{ modal: true },
		DialogResponses.deleteResponse,
	);

	const deleting = l10n.t('Deleting image "{0}"...', tagName);

	await window.withProgress(
		{ location: ProgressLocation.Notification, title: deleting },
		async () => {
			try {
				await provider.deleteTag(node.wrappedItem);
			} catch (error) {
				const errorType: string =
					parseError(error).errorType.toLowerCase();

				if (errorType === "405" || errorType === "unsupported") {
					// Don't wait
					// eslint-disable-next-line @typescript-eslint/no-floating-promises
					context.ui.showWarningMessage(
						"Deleting remote images is not supported on this registry. It may need to be enabled.",
						{ learnMoreLink: "https://aka.ms/AA7jsql" },
					);

					throw new UserCancelledError();
				} else {
					throw error;
				}
			}
		},
	);

	// Other tags that also matched the image may have been deleted, so refresh the whole repository
	// don't wait
	void ext.registriesTree.refresh();

	void window.showInformationMessage(
		l10n.t('Successfully deleted image "{0}".', tagName),
	);
}
