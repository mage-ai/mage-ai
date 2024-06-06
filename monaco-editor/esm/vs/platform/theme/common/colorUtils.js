/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
/**
 * Returns the css variable name for the given color identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editorSuggestWidget.background` is `--vscode-editorSuggestWidget-background`.
 */
export function asCssVariableName(colorIdent) {
    return `--vscode-${colorIdent.replace(/\./g, '-')}`;
}
export function asCssVariable(color) {
    return `var(${asCssVariableName(color)})`;
}
export function asCssVariableWithDefault(color, defaultCssValue) {
    return `var(${asCssVariableName(color)}, ${defaultCssValue})`;
}
// color registry
export const Extensions = {
    ColorContribution: 'base.contributions.colors'
};
class ColorRegistry {
    constructor() {
        this._onDidChangeSchema = new Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.colorSchema = { type: 'object', properties: {} };
        this.colorReferenceSchema = { type: 'string', enum: [], enumDescriptions: [] };
        this.colorsById = {};
    }
    registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
        const colorContribution = { id, description, defaults, needsTransparency, deprecationMessage };
        this.colorsById[id] = colorContribution;
        const propertySchema = { type: 'string', description, format: 'color-hex', defaultSnippets: [{ body: '${1:#ff0000}' }] };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (needsTransparency) {
            propertySchema.pattern = '^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$';
            propertySchema.patternErrorMessage = 'This color must be transparent or it will obscure content';
        }
        this.colorSchema.properties[id] = propertySchema;
        this.colorReferenceSchema.enum.push(id);
        this.colorReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    getColors() {
        return Object.keys(this.colorsById).map(id => this.colorsById[id]);
    }
    resolveDefaultColor(id, theme) {
        const colorDesc = this.colorsById[id];
        if (colorDesc && colorDesc.defaults) {
            const colorValue = colorDesc.defaults[theme.type];
            return resolveColorValue(colorValue, theme);
        }
        return undefined;
    }
    getColorSchema() {
        return this.colorSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.colorsById).sort(sorter).map(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
    }
}
const colorRegistry = new ColorRegistry();
platform.Registry.add(Extensions.ColorContribution, colorRegistry);
export function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
    return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
// ----- color functions
export function executeTransform(transform, theme) {
    var _a, _b, _c, _d;
    switch (transform.op) {
        case 0 /* ColorTransformType.Darken */:
            return (_a = resolveColorValue(transform.value, theme)) === null || _a === void 0 ? void 0 : _a.darken(transform.factor);
        case 1 /* ColorTransformType.Lighten */:
            return (_b = resolveColorValue(transform.value, theme)) === null || _b === void 0 ? void 0 : _b.lighten(transform.factor);
        case 2 /* ColorTransformType.Transparent */:
            return (_c = resolveColorValue(transform.value, theme)) === null || _c === void 0 ? void 0 : _c.transparent(transform.factor);
        case 3 /* ColorTransformType.Opaque */: {
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return resolveColorValue(transform.value, theme);
            }
            return (_d = resolveColorValue(transform.value, theme)) === null || _d === void 0 ? void 0 : _d.makeOpaque(backgroundColor);
        }
        case 4 /* ColorTransformType.OneOf */:
            for (const candidate of transform.values) {
                const color = resolveColorValue(candidate, theme);
                if (color) {
                    return color;
                }
            }
            return undefined;
        case 6 /* ColorTransformType.IfDefinedThenElse */:
            return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
        case 5 /* ColorTransformType.LessProminent */: {
            const from = resolveColorValue(transform.value, theme);
            if (!from) {
                return undefined;
            }
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return from.transparent(transform.factor * transform.transparency);
            }
            return from.isDarkerThan(backgroundColor)
                ? Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency)
                : Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
        }
        default:
            throw assertNever(transform);
    }
}
export function darken(colorValue, factor) {
    return { op: 0 /* ColorTransformType.Darken */, value: colorValue, factor };
}
export function lighten(colorValue, factor) {
    return { op: 1 /* ColorTransformType.Lighten */, value: colorValue, factor };
}
export function transparent(colorValue, factor) {
    return { op: 2 /* ColorTransformType.Transparent */, value: colorValue, factor };
}
export function oneOf(...colorValues) {
    return { op: 4 /* ColorTransformType.OneOf */, values: colorValues };
}
export function ifDefinedThenElse(ifArg, thenArg, elseArg) {
    return { op: 6 /* ColorTransformType.IfDefinedThenElse */, if: ifArg, then: thenArg, else: elseArg };
}
export function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
    return { op: 5 /* ColorTransformType.LessProminent */, value: colorValue, background: backgroundColorValue, factor, transparency };
}
// ----- implementation
/**
 * @param colorValue Resolve a color value in the context of a theme
 */
export function resolveColorValue(colorValue, theme) {
    if (colorValue === null) {
        return undefined;
    }
    else if (typeof colorValue === 'string') {
        if (colorValue[0] === '#') {
            return Color.fromHex(colorValue);
        }
        return theme.getColor(colorValue);
    }
    else if (colorValue instanceof Color) {
        return colorValue;
    }
    else if (typeof colorValue === 'object') {
        return executeTransform(colorValue, theme);
    }
    return undefined;
}
export const workbenchColorsSchemaId = 'vscode://schemas/workbench-colors';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
