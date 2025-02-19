/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon, TreeItemCollapsibleState } from "vscode";

import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { getCommonGroupIcon } from "../settings/CommonProperties";
import {
	ContainerProperty,
	getContainerStateIcon,
	NonComposeGroupName,
} from "./ContainerProperties";
import { DockerContainerInfo } from "./ContainersTreeItem";

export class ContainerGroupTreeItem extends LocalGroupTreeItemBase<
	DockerContainerInfo,
	ContainerProperty
> {
	public childTypeLabel: string = "container";

	public override readonly initialCollapsibleState:
		| TreeItemCollapsibleState
		| undefined; // TypeScript gets mad if we don't re-declare this here
	public readonly canMultiSelect: boolean = true;

	public constructor(
		parent: LocalRootTreeItemBase<DockerContainerInfo, ContainerProperty>,
		group: string,
		items: DockerContainerInfo[],
	) {
		super(parent, group, items);

		if (this.parent.groupBySetting === "Compose Project Name") {
			// Expand compose group nodes by default
			this.initialCollapsibleState = TreeItemCollapsibleState.Expanded;
		}
	}

	public get contextValue(): string {
		if (
			this.parent.groupBySetting === "Compose Project Name" &&
			this.group !== NonComposeGroupName
		) {
			return "containerGroup;composeGroup";
		}

		return "containerGroup";
	}

	public get iconPath(): ThemeIcon {
		switch (this.parent.groupBySetting) {
			case "ContainerId":
			case "ContainerName":
			case "Networks":
				return new ThemeIcon("repo-forked");

			case "Ports":
			case "Status":
			case "Compose Project Name":
				return new ThemeIcon("multiple-windows");

			case "State":
				return getContainerStateIcon(this.group);

			case "Image":
			case "Label":
				return new ThemeIcon("multiple-windows");

			default:
				return getCommonGroupIcon(this.parent.groupBySetting);
		}
	}

	public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
		return this.ChildTreeItems.some((container: AzExtTreeItem) =>
			this.matchesValue(container, expectedContextValue),
		);
	}

	private matchesValue(
		container: AzExtTreeItem,
		expectedContextValue: string | RegExp,
	): boolean {
		return (
			container.contextValue === expectedContextValue ||
			(expectedContextValue instanceof RegExp &&
				expectedContextValue.test(container.contextValue))
		);
	}

	public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
		const containers = this.ChildTreeItems;

		const errors = [];

		for (const container of containers) {
			try {
				await container.deleteTreeItem(context);
			} catch (error) {
				errors.push(error);
			}
		}

		if (errors.length > 0) {
			throw new Error(errors.join());
		}
	}
}
