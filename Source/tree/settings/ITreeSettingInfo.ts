/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ITreeSettingInfo<T extends string> {
	properties: ITreePropertyInfo<T>[];

	defaultProperty: T;
}

export interface ITreeArraySettingInfo<T extends string> {
	properties: ITreePropertyInfo<T>[];

	defaultProperty: T[];
}

export interface ITreePropertyInfo<T extends string> {
	property: T;

	exampleValue?: string;

	description?: string;
}
