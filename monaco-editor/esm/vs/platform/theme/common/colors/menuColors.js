/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { registerColor } from '../colorUtils.js';
// Import the colors we need
import { contrastBorder, activeContrastBorder } from './baseColors.js';
import { selectForeground, selectBackground } from './inputColors.js';
import { listActiveSelectionBackground, listActiveSelectionForeground } from './listColors.js';
export const menuBorder = registerColor('menu.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('menuBorder', "Border color of menus."));
export const menuForeground = registerColor('menu.foreground', { dark: selectForeground, light: selectForeground, hcDark: selectForeground, hcLight: selectForeground }, nls.localize('menuForeground', "Foreground color of menu items."));
export const menuBackground = registerColor('menu.background', { dark: selectBackground, light: selectBackground, hcDark: selectBackground, hcLight: selectBackground }, nls.localize('menuBackground', "Background color of menu items."));
export const menuSelectionForeground = registerColor('menu.selectionForeground', { dark: listActiveSelectionForeground, light: listActiveSelectionForeground, hcDark: listActiveSelectionForeground, hcLight: listActiveSelectionForeground }, nls.localize('menuSelectionForeground', "Foreground color of the selected menu item in menus."));
export const menuSelectionBackground = registerColor('menu.selectionBackground', { dark: listActiveSelectionBackground, light: listActiveSelectionBackground, hcDark: listActiveSelectionBackground, hcLight: listActiveSelectionBackground }, nls.localize('menuSelectionBackground', "Background color of the selected menu item in menus."));
export const menuSelectionBorder = registerColor('menu.selectionBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('menuSelectionBorder', "Border color of the selected menu item in menus."));
export const menuSeparatorBackground = registerColor('menu.separatorBackground', { dark: '#606060', light: '#D4D4D4', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('menuSeparatorBackground', "Color of a separator menu item in menus."));
