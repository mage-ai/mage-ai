/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { constObservable } from '../../../../base/common/observable.js';
import { HoverForeignElementAnchor } from '../../hover/browser/hoverTypes.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { InlineEditController } from './inlineEditController.js';
import { InlineEditHintsContentWidget } from './inlineEditHintsWidget.js';
export class InlineEditHover {
    constructor(owner, range, controller) {
        this.owner = owner;
        this.range = range;
        this.controller = controller;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
let InlineEditHoverParticipant = class InlineEditHoverParticipant {
    constructor(_editor, _instantiationService, _telemetryService) {
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this.hoverOrdinal = 5;
    }
    suggestHoverAnchor(mouseEvent) {
        const controller = InlineEditController.get(this._editor);
        if (!controller) {
            return null;
        }
        const target = mouseEvent.target;
        if (target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            // handle the case where the mouse is over the view zone
            const viewZoneData = target.detail;
            if (controller.shouldShowHoverAtViewZone(viewZoneData.viewZoneId)) {
                // const range = Range.fromPositions(this._editor.getModel()!.validatePosition(viewZoneData.positionBefore || viewZoneData.position));
                const range = target.range;
                return new HoverForeignElementAnchor(1000, this, range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            // handle the case where the mouse is over the empty portion of a line following ghost text
            if (controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            // handle the case where the mouse is directly over ghost text
            const mightBeForeignElement = target.detail.mightBeForeignElement;
            if (mightBeForeignElement && controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        return null;
    }
    computeSync(anchor, lineDecorations) {
        if (this._editor.getOption(63 /* EditorOption.inlineEdit */).showToolbar !== 'onHover') {
            return [];
        }
        const controller = InlineEditController.get(this._editor);
        if (controller && controller.shouldShowHoverAt(anchor.range)) {
            return [new InlineEditHover(this, anchor.range, controller)];
        }
        return [];
    }
    renderHoverParts(context, hoverParts) {
        const disposableStore = new DisposableStore();
        this._telemetryService.publicLog2('inlineEditHover.shown');
        const w = this._instantiationService.createInstance(InlineEditHintsContentWidget, this._editor, false, constObservable(null));
        context.fragment.appendChild(w.getDomNode());
        disposableStore.add(w);
        return disposableStore;
    }
};
InlineEditHoverParticipant = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITelemetryService)
], InlineEditHoverParticipant);
export { InlineEditHoverParticipant };
