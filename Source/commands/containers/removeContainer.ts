/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";

import { ext } from "../../extensionVariables";
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";
import { multiSelectNodes } from "../../utils/multiSelectNodes";

export async function removeContainer(
	context: IActionContext,
	node?: ContainerTreeItem,
	nodes?: ContainerTreeItem[],
): Promise<void> {
	nodes = await multiSelectNodes(
		{
			...context,
			noItemFoundErrorMessage: vscode.l10n.t(
				"No containers are available to remove",
			),
		},
		ext.containersTree,
		ContainerTreeItem.allContextRegExp,
		node,
		nodes,
	);

	let confirmRemove: string;

	if (nodes.length === 1) {
		confirmRemove = vscode.l10n.t(
			'Are you sure you want to remove container "{0}"?',
			nodes[0].label,
		);
	} else {
		confirmRemove = vscode.l10n.t(
			"Are you sure you want to remove selected containers?",
		);
	}

	// no need to check result - cancel will throw a UserCancelledError
	await context.ui.showWarningMessage(
		confirmRemove,
		{ modal: true },
		{ title: vscode.l10n.t("Remove") },
	);

	const removing: string = vscode.l10n.t("Removing container(s)...");

	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: removing },
		async () => {
			await Promise.all(
				nodes.map(async (n) => await n.deleteTreeItem(context)),
			);
		},
	);
}
