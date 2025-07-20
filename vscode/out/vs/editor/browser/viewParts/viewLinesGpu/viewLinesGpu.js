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
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextureAtlasPage } from '../../gpu/atlas/textureAtlasPage.js';
import { GPULifecycle } from '../../gpu/gpuDisposable.js';
import { quadVertices } from '../../gpu/gpuUtils.js';
import { ViewGpuContext } from '../../gpu/viewGpuContext.js';
import { FloatHorizontalRange, HorizontalPosition, HorizontalRange, LineVisibleRanges, VisibleRanges } from '../../view/renderingContext.js';
import { ViewPart } from '../../view/viewPart.js';
import { ViewLineOptions } from '../viewLines/viewLineOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { TextureAtlas } from '../../gpu/atlas/textureAtlas.js';
import { createContentSegmenter } from '../../gpu/contentSegmenter.js';
import { ViewportRenderStrategy } from '../../gpu/renderStrategy/viewportRenderStrategy.js';
import { FullFileRenderStrategy } from '../../gpu/renderStrategy/fullFileRenderStrategy.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { GlyphRasterizer } from '../../gpu/raster/glyphRasterizer.js';
var GlyphStorageBufferInfo;
(function (GlyphStorageBufferInfo) {
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["FloatsPerEntry"] = 6] = "FloatsPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["BytesPerEntry"] = 24] = "BytesPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TexturePosition"] = 0] = "Offset_TexturePosition";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TextureSize"] = 2] = "Offset_TextureSize";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_OriginPosition"] = 4] = "Offset_OriginPosition";
})(GlyphStorageBufferInfo || (GlyphStorageBufferInfo = {}));
/**
 * The GPU implementation of the ViewLines part.
 */
let ViewLinesGpu = class ViewLinesGpu extends ViewPart {
    constructor(context, _viewGpuContext, _instantiationService, _logService) {
        super(context);
        this._viewGpuContext = _viewGpuContext;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._atlasGpuTextureVersions = [];
        this._initialized = false;
        this._glyphRasterizer = this._register(new MutableDisposable());
        this._renderStrategy = this._register(new MutableDisposable());
        this.canvas = this._viewGpuContext.canvas.domNode;
        // Re-render the following frame after canvas device pixel dimensions change, provided a
        // new render does not occur.
        this._register(autorun(reader => {
            this._viewGpuContext.canvasDevicePixelDimensions.read(reader);
            const lastViewportData = this._lastViewportData;
            if (lastViewportData) {
                setTimeout(() => {
                    if (lastViewportData === this._lastViewportData) {
                        this.renderText(lastViewportData);
                    }
                });
            }
        }));
        this.initWebgpu();
    }
    async initWebgpu() {
        // #region General
        this._device = ViewGpuContext.deviceSync || await ViewGpuContext.device;
        if (this._store.isDisposed) {
            return;
        }
        const atlas = ViewGpuContext.atlas;
        // Rerender when the texture atlas deletes glyphs
        this._register(atlas.onDidDeleteGlyphs(() => {
            this._atlasGpuTextureVersions.length = 0;
            this._atlasGpuTextureVersions[0] = 0;
            this._atlasGpuTextureVersions[1] = 0;
            this._renderStrategy.value.reset();
        }));
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._viewGpuContext.ctx.configure({
            device: this._device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });
        this._renderPassColorAttachment = {
            view: null, // Will be filled at render time
            loadOp: 'load',
            storeOp: 'store',
        };
        this._renderPassDescriptor = {
            label: 'Monaco render pass',
            colorAttachments: [this._renderPassColorAttachment],
        };
        // #endregion General
        // #region Uniforms
        let layoutInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 6] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 24] = "BytesPerEntry";
                Info[Info["Offset_CanvasWidth____"] = 0] = "Offset_CanvasWidth____";
                Info[Info["Offset_CanvasHeight___"] = 1] = "Offset_CanvasHeight___";
                Info[Info["Offset_ViewportOffsetX"] = 2] = "Offset_ViewportOffsetX";
                Info[Info["Offset_ViewportOffsetY"] = 3] = "Offset_ViewportOffsetY";
                Info[Info["Offset_ViewportWidth__"] = 4] = "Offset_ViewportWidth__";
                Info[Info["Offset_ViewportHeight_"] = 5] = "Offset_ViewportHeight_";
            })(Info || (Info = {}));
            const bufferValues = new Float32Array(6 /* Info.FloatsPerEntry */);
            const updateBufferValues = (canvasDevicePixelWidth = this.canvas.width, canvasDevicePixelHeight = this.canvas.height) => {
                bufferValues[0 /* Info.Offset_CanvasWidth____ */] = canvasDevicePixelWidth;
                bufferValues[1 /* Info.Offset_CanvasHeight___ */] = canvasDevicePixelHeight;
                bufferValues[2 /* Info.Offset_ViewportOffsetX */] = Math.ceil(this._context.configuration.options.get(164 /* EditorOption.layoutInfo */).contentLeft * getActiveWindow().devicePixelRatio);
                bufferValues[3 /* Info.Offset_ViewportOffsetY */] = 0;
                bufferValues[4 /* Info.Offset_ViewportWidth__ */] = bufferValues[0 /* Info.Offset_CanvasWidth____ */] - bufferValues[2 /* Info.Offset_ViewportOffsetX */];
                bufferValues[5 /* Info.Offset_ViewportHeight_ */] = bufferValues[1 /* Info.Offset_CanvasHeight___ */] - bufferValues[3 /* Info.Offset_ViewportOffsetY */];
                return bufferValues;
            };
            layoutInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco uniform buffer',
                size: 24 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => updateBufferValues())).object;
            this._register(runOnChange(this._viewGpuContext.canvasDevicePixelDimensions, ({ width, height }) => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues(width, height));
            }));
            this._register(runOnChange(this._viewGpuContext.contentLeft, () => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues());
            }));
        }
        let atlasInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 2] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 8] = "BytesPerEntry";
                Info[Info["Offset_Width_"] = 0] = "Offset_Width_";
                Info[Info["Offset_Height"] = 1] = "Offset_Height";
            })(Info || (Info = {}));
            atlasInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco atlas info uniform buffer',
                size: 8 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => {
                const values = new Float32Array(2 /* Info.FloatsPerEntry */);
                values[0 /* Info.Offset_Width_ */] = atlas.pageSize;
                values[1 /* Info.Offset_Height */] = atlas.pageSize;
                return values;
            })).object;
        }
        // #endregion Uniforms
        // #region Storage buffers
        const fontFamily = this._context.configuration.options.get(58 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(61 /* EditorOption.fontSize */);
        this._glyphRasterizer.value = this._register(new GlyphRasterizer(fontSize, fontFamily, this._viewGpuContext.devicePixelRatio.get(), ViewGpuContext.decorationStyleCache));
        this._register(runOnChange(this._viewGpuContext.devicePixelRatio, () => {
            this._refreshGlyphRasterizer();
        }));
        this._renderStrategy.value = this._instantiationService.createInstance(FullFileRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        // this._renderStrategy.value = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device);
        this._glyphStorageBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco glyph storage buffer',
            size: TextureAtlas.maximumPageCount * (TextureAtlasPage.maximumGlyphCount * 24 /* GlyphStorageBufferInfo.BytesPerEntry */),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._atlasGpuTextureVersions[0] = 0;
        this._atlasGpuTextureVersions[1] = 0;
        this._atlasGpuTexture = this._register(GPULifecycle.createTexture(this._device, {
            label: 'Monaco atlas texture',
            format: 'rgba8unorm',
            size: { width: atlas.pageSize, height: atlas.pageSize, depthOrArrayLayers: TextureAtlas.maximumPageCount },
            dimension: '2d',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        })).object;
        this._updateAtlasStorageBufferAndTexture();
        // #endregion Storage buffers
        // #region Vertex buffer
        this._vertexBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco vertex buffer',
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }, quadVertices)).object;
        // #endregion Vertex buffer
        // #region Shader module
        const module = this._device.createShaderModule({
            label: 'Monaco shader module',
            code: this._renderStrategy.value.wgsl,
        });
        // #endregion Shader module
        // #region Pipeline
        this._pipeline = this._device.createRenderPipeline({
            label: 'Monaco render pipeline',
            layout: 'auto',
            vertex: {
                module,
                buffers: [
                    {
                        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats, 4 bytes each
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
                        ],
                    }
                ]
            },
            fragment: {
                module,
                targets: [
                    {
                        format: presentationFormat,
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            },
                            alpha: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            },
                        },
                    }
                ],
            },
        });
        // #endregion Pipeline
        // #region Bind group
        this._rebuildBindGroup = () => {
            this._bindGroup = this._device.createBindGroup({
                label: 'Monaco bind group',
                layout: this._pipeline.getBindGroupLayout(0),
                entries: [
                    // TODO: Pass in generically as array?
                    { binding: 0 /* BindingId.GlyphInfo */, resource: { buffer: this._glyphStorageBuffer } },
                    {
                        binding: 2 /* BindingId.TextureSampler */, resource: this._device.createSampler({
                            label: 'Monaco atlas sampler',
                            magFilter: 'nearest',
                            minFilter: 'nearest',
                        })
                    },
                    { binding: 3 /* BindingId.Texture */, resource: this._atlasGpuTexture.createView() },
                    { binding: 4 /* BindingId.LayoutInfoUniform */, resource: { buffer: layoutInfoUniformBuffer } },
                    { binding: 5 /* BindingId.AtlasDimensionsUniform */, resource: { buffer: atlasInfoUniformBuffer } },
                    ...this._renderStrategy.value.bindGroupEntries
                ],
            });
        };
        this._rebuildBindGroup();
        // endregion Bind group
        this._initialized = true;
        // Render the initial viewport immediately after initialization
        if (this._initViewportData) {
            // HACK: Rendering multiple times in the same frame like this isn't ideal, but there
            //       isn't an easy way to merge viewport data
            for (const viewportData of this._initViewportData) {
                this.renderText(viewportData);
            }
            this._initViewportData = undefined;
        }
    }
    _refreshRenderStrategy(viewportData) {
        if (this._renderStrategy.value?.type === 'viewport') {
            return;
        }
        if (viewportData.endLineNumber < FullFileRenderStrategy.maxSupportedLines && this._viewportMaxColumn(viewportData) < FullFileRenderStrategy.maxSupportedColumns) {
            return;
        }
        this._logService.trace(`File is larger than ${FullFileRenderStrategy.maxSupportedLines} lines or ${FullFileRenderStrategy.maxSupportedColumns} columns, switching to viewport render strategy`);
        const viewportRenderStrategy = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        this._renderStrategy.value = viewportRenderStrategy;
        this._register(viewportRenderStrategy.onDidChangeBindGroupEntries(() => this._rebuildBindGroup?.()));
        this._rebuildBindGroup?.();
    }
    _viewportMaxColumn(viewportData) {
        let maxColumn = 0;
        let lineData;
        for (let i = viewportData.startLineNumber; i <= viewportData.endLineNumber; i++) {
            lineData = viewportData.getViewLineRenderingData(i);
            maxColumn = Math.max(maxColumn, lineData.maxColumn);
        }
        return maxColumn;
    }
    _updateAtlasStorageBufferAndTexture() {
        for (const [layerIndex, page] of ViewGpuContext.atlas.pages.entries()) {
            if (layerIndex >= TextureAtlas.maximumPageCount) {
                console.log(`Attempt to upload atlas page [${layerIndex}], only ${TextureAtlas.maximumPageCount} are supported currently`);
                continue;
            }
            // Skip the update if it's already the latest version
            if (page.version === this._atlasGpuTextureVersions[layerIndex]) {
                continue;
            }
            this._logService.trace('Updating atlas page[', layerIndex, '] from version ', this._atlasGpuTextureVersions[layerIndex], ' to version ', page.version);
            const entryCount = 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount;
            const values = new Float32Array(entryCount);
            let entryOffset = 0;
            for (const glyph of page.glyphs) {
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */] = glyph.x;
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */ + 1] = glyph.y;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */] = glyph.w;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */ + 1] = glyph.h;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */] = glyph.originOffsetX;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */ + 1] = glyph.originOffsetY;
                entryOffset += 6 /* GlyphStorageBufferInfo.FloatsPerEntry */;
            }
            if (entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ > TextureAtlasPage.maximumGlyphCount) {
                throw new Error(`Attempting to write more glyphs (${entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */}) than the GPUBuffer can hold (${TextureAtlasPage.maximumGlyphCount})`);
            }
            this._device.queue.writeBuffer(this._glyphStorageBuffer, layerIndex * 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount * Float32Array.BYTES_PER_ELEMENT, values, 0, 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount);
            if (page.usedArea.right - page.usedArea.left > 0 && page.usedArea.bottom - page.usedArea.top > 0) {
                this._device.queue.copyExternalImageToTexture({ source: page.source }, {
                    texture: this._atlasGpuTexture,
                    origin: {
                        x: page.usedArea.left,
                        y: page.usedArea.top,
                        z: layerIndex
                    }
                }, {
                    width: page.usedArea.right - page.usedArea.left + 1,
                    height: page.usedArea.bottom - page.usedArea.top + 1
                });
            }
            this._atlasGpuTextureVersions[layerIndex] = page.version;
        }
    }
    prepareRender(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    render(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    // #region Event handlers
    // Since ViewLinesGpu currently coordinates rendering to the canvas, it must listen to all
    // changed events that any GPU part listens to. This is because any drawing to the canvas will
    // clear it for that frame, so all parts must be rendered every time.
    //
    // Additionally, since this is intrinsically linked to ViewLines, it must also listen to events
    // from that side. Luckily rendering is cheap, it's only when uploaded data changes does it
    // start to cost.
    onConfigurationChanged(e) {
        this._refreshGlyphRasterizer();
        return true;
    }
    onCursorStateChanged(e) { return true; }
    onDecorationsChanged(e) { return true; }
    onFlushed(e) { return true; }
    onLinesChanged(e) { return true; }
    onLinesDeleted(e) { return true; }
    onLinesInserted(e) { return true; }
    onLineMappingChanged(e) { return true; }
    onRevealRangeRequest(e) { return true; }
    onScrollChanged(e) { return true; }
    onThemeChanged(e) { return true; }
    onZonesChanged(e) { return true; }
    // #endregion
    _refreshGlyphRasterizer() {
        const glyphRasterizer = this._glyphRasterizer.value;
        if (!glyphRasterizer) {
            return;
        }
        const fontFamily = this._context.configuration.options.get(58 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(61 /* EditorOption.fontSize */);
        const devicePixelRatio = this._viewGpuContext.devicePixelRatio.get();
        if (glyphRasterizer.fontFamily !== fontFamily ||
            glyphRasterizer.fontSize !== fontSize ||
            glyphRasterizer.devicePixelRatio !== devicePixelRatio) {
            this._glyphRasterizer.value = new GlyphRasterizer(fontSize, fontFamily, devicePixelRatio, ViewGpuContext.decorationStyleCache);
        }
    }
    renderText(viewportData) {
        if (this._initialized) {
            this._refreshRenderStrategy(viewportData);
            return this._renderText(viewportData);
        }
        else {
            this._initViewportData = this._initViewportData ?? [];
            this._initViewportData.push(viewportData);
        }
    }
    _renderText(viewportData) {
        this._viewGpuContext.rectangleRenderer.draw(viewportData);
        const options = new ViewLineOptions(this._context.configuration, this._context.theme.type);
        this._renderStrategy.value.update(viewportData, options);
        this._updateAtlasStorageBufferAndTexture();
        const encoder = this._device.createCommandEncoder({ label: 'Monaco command encoder' });
        this._renderPassColorAttachment.view = this._viewGpuContext.ctx.getCurrentTexture().createView({ label: 'Monaco canvas texture view' });
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._vertexBuffer);
        // Only draw the content area
        const contentLeft = Math.ceil(this._viewGpuContext.contentLeft.get() * this._viewGpuContext.devicePixelRatio.get());
        pass.setScissorRect(contentLeft, 0, this.canvas.width - contentLeft, this.canvas.height);
        pass.setBindGroup(0, this._bindGroup);
        this._renderStrategy.value.draw(pass, viewportData);
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
        this._lastViewportData = viewportData;
        this._lastViewLineOptions = options;
    }
    linesVisibleRangesForRange(_range, includeNewLines) {
        if (!this._lastViewportData) {
            return null;
        }
        const originalEndLineNumber = _range.endLineNumber;
        const range = Range.intersectRanges(_range, this._lastViewportData.visibleRange);
        if (!range) {
            return null;
        }
        const rendStartLineNumber = this._lastViewportData.startLineNumber;
        const rendEndLineNumber = this._lastViewportData.endLineNumber;
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData || !viewLineOptions) {
            return null;
        }
        const visibleRanges = [];
        let nextLineModelLineNumber = 0;
        if (includeNewLines) {
            nextLineModelLineNumber = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(range.startLineNumber, 1)).lineNumber;
        }
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
                continue;
            }
            const startColumn = lineNumber === range.startLineNumber ? range.startColumn : 1;
            const continuesInNextLine = lineNumber !== originalEndLineNumber;
            const endColumn = continuesInNextLine ? this._context.viewModel.getLineMaxColumn(lineNumber) : range.endColumn;
            const visibleRangesForLine = this._visibleRangesForLineRange(lineNumber, startColumn, endColumn);
            if (!visibleRangesForLine) {
                continue;
            }
            if (includeNewLines && lineNumber < originalEndLineNumber) {
                const currentLineModelLineNumber = nextLineModelLineNumber;
                nextLineModelLineNumber = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber + 1, 1)).lineNumber;
                if (currentLineModelLineNumber !== nextLineModelLineNumber) {
                    visibleRangesForLine.ranges[visibleRangesForLine.ranges.length - 1].width += viewLineOptions.spaceWidth;
                }
            }
            visibleRanges.push(new LineVisibleRanges(visibleRangesForLine.outsideRenderedLine, lineNumber, HorizontalRange.from(visibleRangesForLine.ranges), continuesInNextLine));
        }
        if (visibleRanges.length === 0) {
            return null;
        }
        return visibleRanges;
    }
    _visibleRangesForLineRange(lineNumber, startColumn, endColumn) {
        if (this.shouldRender()) {
            // Cannot read from the DOM because it is dirty
            // i.e. the model & the dom are out of sync, so I'd be reading something stale
            return null;
        }
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData || !viewLineOptions || lineNumber < viewportData.startLineNumber || lineNumber > viewportData.endLineNumber) {
            return null;
        }
        // Resolve tab widths for this line
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        let contentSegmenter;
        if (!(lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations)) {
            contentSegmenter = createContentSegmenter(lineData, viewLineOptions);
        }
        let chars = '';
        let resolvedStartColumn = 0;
        let resolvedStartCssPixelOffset = 0;
        for (let x = 0; x < startColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedStartCssPixelOffset += (this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width / getActiveWindow().devicePixelRatio) - viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedStartColumn = CursorColumns.nextRenderTabStop(resolvedStartColumn, lineData.tabSize);
            }
            else {
                resolvedStartColumn++;
            }
        }
        let resolvedEndColumn = resolvedStartColumn;
        let resolvedEndCssPixelOffset = 0;
        for (let x = startColumn - 1; x < endColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedEndCssPixelOffset += (this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width / getActiveWindow().devicePixelRatio) - viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedEndColumn = CursorColumns.nextRenderTabStop(resolvedEndColumn, lineData.tabSize);
            }
            else {
                resolvedEndColumn++;
            }
        }
        // Visible horizontal range in _scaled_ pixels
        const result = new VisibleRanges(false, [new FloatHorizontalRange(resolvedStartColumn * viewLineOptions.spaceWidth + resolvedStartCssPixelOffset, (resolvedEndColumn - resolvedStartColumn) * viewLineOptions.spaceWidth + resolvedEndCssPixelOffset)
        ]);
        return result;
    }
    visibleRangeForPosition(position) {
        const visibleRanges = this._visibleRangesForLineRange(position.lineNumber, position.column, position.column);
        if (!visibleRanges) {
            return null;
        }
        return new HorizontalPosition(visibleRanges.outsideRenderedLine, visibleRanges.ranges[0].left);
    }
    getLineWidth(lineNumber) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const lineRange = this._visibleRangesForLineRange(lineNumber, 1, lineData.maxColumn);
        const lastRange = lineRange?.ranges.at(-1);
        if (lastRange) {
            return lastRange.width;
        }
        return undefined;
    }
    getPositionAtCoordinate(lineNumber, mouseContentHorizontalOffset) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        const dpr = getActiveWindow().devicePixelRatio;
        const mouseContentHorizontalOffsetDevicePixels = mouseContentHorizontalOffset * dpr;
        const spaceWidthDevicePixels = this._lastViewLineOptions.spaceWidth * dpr;
        const contentSegmenter = createContentSegmenter(lineData, this._lastViewLineOptions);
        let widthSoFar = 0;
        let charWidth = 0;
        let tabXOffset = 0;
        let column = 0;
        for (let x = 0; x < content.length; x++) {
            const chars = contentSegmenter.getSegmentAtIndex(x);
            // Part of an earlier segment
            if (chars === undefined) {
                column++;
                continue;
            }
            // Get the width of the character
            if (chars === '\t') {
                // Find the pixel offset between the current position and the next tab stop
                const offsetBefore = x + tabXOffset;
                tabXOffset = CursorColumns.nextRenderTabStop(x + tabXOffset, lineData.tabSize);
                charWidth = spaceWidthDevicePixels * (tabXOffset - offsetBefore);
                // Convert back to offset excluding x and the current character
                tabXOffset -= x + 1;
            }
            else if (lineData.isBasicASCII && this._lastViewLineOptions.useMonospaceOptimizations) {
                charWidth = spaceWidthDevicePixels;
            }
            else {
                charWidth = this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width;
            }
            if (mouseContentHorizontalOffsetDevicePixels < widthSoFar + charWidth / 2) {
                break;
            }
            widthSoFar += charWidth;
            column++;
        }
        return new Position(lineNumber, column + 1);
    }
};
ViewLinesGpu = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], ViewLinesGpu);
export { ViewLinesGpu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzR3B1L3ZpZXdMaW5lc0dwdS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFjLGlCQUFpQixFQUFnRCxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2TSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FB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