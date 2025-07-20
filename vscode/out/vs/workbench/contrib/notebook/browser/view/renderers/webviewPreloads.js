/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
async function webviewPreloads(ctx) {
    /* eslint-disable no-restricted-globals, no-restricted-syntax */
    // The use of global `window` should be fine in this context, even
    // with aux windows. This code is running from within an `iframe`
    // where there is only one `window` object anyway.
    const userAgent = navigator.userAgent;
    const isChrome = (userAgent.indexOf('Chrome') >= 0);
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    function promiseWithResolvers() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve: resolve, reject: reject };
    }
    let currentOptions = ctx.options;
    const isWorkspaceTrusted = ctx.isWorkspaceTrusted;
    let currentRenderOptions = ctx.renderOptions;
    const settingChange = createEmitter();
    const acquireVsCodeApi = globalThis.acquireVsCodeApi;
    const vscode = acquireVsCodeApi();
    delete globalThis.acquireVsCodeApi;
    const tokenizationStyle = new CSSStyleSheet();
    tokenizationStyle.replaceSync(ctx.style.tokenizationCss);
    const runWhenIdle = (typeof requestIdleCallback !== 'function' || typeof cancelIdleCallback !== 'function')
        ? (runner) => {
            setTimeout(() => {
                if (disposed) {
                    return;
                }
                const end = Date.now() + 15; // one frame at 64fps
                runner(Object.freeze({
                    didTimeout: true,
                    timeRemaining() {
                        return Math.max(0, end - Date.now());
                    }
                }));
            });
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                }
            };
        }
        : (runner, timeout) => {
            const handle = requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined);
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                    cancelIdleCallback(handle);
                }
            };
        };
    function getOutputContainer(event) {
        for (const node of event.composedPath()) {
            if (node instanceof HTMLElement && node.classList.contains('output')) {
                return {
                    id: node.id
                };
            }
        }
        return;
    }
    let lastFocusedOutput = undefined;
    const handleOutputFocusOut = (event) => {
        const outputFocus = event && getOutputContainer(event);
        if (!outputFocus) {
            return;
        }
        // Possible we're tabbing through the elements of the same output.
        // Lets see if focus is set back to the same output.
        lastFocusedOutput = undefined;
        setTimeout(() => {
            if (lastFocusedOutput?.id === outputFocus.id) {
                return;
            }
            postNotebookMessage('outputBlur', outputFocus);
        }, 0);
    };
    const isEditableElement = (element) => {
        return element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea'
            || ('editContext' in element && !!element.editContext);
    };
    // check if an input element is focused within the output element
    const checkOutputInputFocus = (e) => {
        lastFocusedOutput = getOutputContainer(e);
        const activeElement = window.document.activeElement;
        if (!activeElement) {
            return;
        }
        const id = lastFocusedOutput?.id;
        if (id && (isEditableElement(activeElement) || activeElement.tagName === 'SELECT')) {
            postNotebookMessage('outputInputFocus', { inputFocused: true, id });
            activeElement.addEventListener('blur', () => {
                postNotebookMessage('outputInputFocus', { inputFocused: false, id });
            }, { once: true });
        }
    };
    const handleInnerClick = (event) => {
        if (!event || !event.view || !event.view.document) {
            return;
        }
        const outputFocus = lastFocusedOutput = getOutputContainer(event);
        for (const node of event.composedPath()) {
            if (node instanceof HTMLAnchorElement && node.href) {
                if (node.href.startsWith('blob:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleBlobUrlClick(node.href, node.download);
                }
                else if (node.href.startsWith('data:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleDataUrl(node.href, node.download);
                }
                else if (node.getAttribute('href')?.trim().startsWith('#')) {
                    // Scrolling to location within current doc
                    if (!node.hash) {
                        postNotebookMessage('scroll-to-reveal', { scrollTop: 0 });
                        return;
                    }
                    const targetId = node.hash.substring(1);
                    // Check outer document first
                    let scrollTarget = event.view.document.getElementById(targetId);
                    if (!scrollTarget) {
                        // Fallback to checking preview shadow doms
                        for (const preview of event.view.document.querySelectorAll('.preview')) {
                            scrollTarget = preview.shadowRoot?.getElementById(targetId);
                            if (scrollTarget) {
                                break;
                            }
                        }
                    }
                    if (scrollTarget) {
                        const scrollTop = scrollTarget.getBoundingClientRect().top + event.view.scrollY;
                        postNotebookMessage('scroll-to-reveal', { scrollTop });
                        return;
                    }
                }
                else {
                    const href = node.getAttribute('href');
                    if (href) {
                        if (href.startsWith('command:') && outputFocus) {
                            postNotebookMessage('outputFocus', outputFocus);
                        }
                        postNotebookMessage('clicked-link', { href });
                    }
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        if (outputFocus) {
            postNotebookMessage('outputFocus', outputFocus);
        }
    };
    const blurOutput = () => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
    };
    const selectOutputContents = (cellOrOutputId) => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNode(cellOutputContainer);
        selection.addRange(range);
    };
    const selectInputContents = (cellOrOutputId) => {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            activeElement.select();
        }
    };
    const onPageUpDownSelectionHandler = (e) => {
        if (!lastFocusedOutput?.id || !e.shiftKey) {
            return;
        }
        // If we're pressing `Shift+Up/Down` then we want to select a line at a time.
        if (e.shiftKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
            e.stopPropagation(); // We don't want the notebook to handle this, default behavior is what we need.
            return;
        }
        // We want to handle just `Shift + PageUp/PageDown` & `Shift + Cmd + ArrowUp/ArrowDown` (for mac)
        if (!(e.code === 'PageUp' || e.code === 'PageDown') && !(e.metaKey && (e.code === 'ArrowDown' || e.code === 'ArrowUp'))) {
            return;
        }
        const outputContainer = window.document.getElementById(lastFocusedOutput.id);
        const selection = window.getSelection();
        if (!outputContainer || !selection?.anchorNode) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // Leave for default behavior.
            return;
        }
        // These should change the scroll position, not adjust the selected cell in the notebook
        e.stopPropagation(); // We don't want the notebook to handle this.
        e.preventDefault(); // We will handle selection.
        const { anchorNode, anchorOffset } = selection;
        const range = document.createRange();
        if (e.code === 'PageDown' || e.code === 'ArrowDown') {
            range.setStart(anchorNode, anchorOffset);
            range.setEnd(outputContainer, 1);
        }
        else {
            range.setStart(outputContainer, 0);
            range.setEnd(anchorNode, anchorOffset);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };
    const disableNativeSelectAll = (e) => {
        if (!lastFocusedOutput?.id) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // The input element will handle this.
            return;
        }
        if ((e.key === 'a' && e.ctrlKey) || (e.metaKey && e.key === 'a')) {
            e.preventDefault(); // We will handle selection in editor code.
            return;
        }
    };
    const handleDataUrl = async (data, downloadName) => {
        postNotebookMessage('clicked-data-url', {
            data,
            downloadName
        });
    };
    const handleBlobUrlClick = async (url, downloadName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                handleDataUrl(reader.result, downloadName);
            });
            reader.readAsDataURL(blob);
        }
        catch (e) {
            console.error(e.message);
        }
    };
    window.document.body.addEventListener('click', handleInnerClick);
    window.document.body.addEventListener('focusin', checkOutputInputFocus);
    window.document.body.addEventListener('focusout', handleOutputFocusOut);
    window.document.body.addEventListener('keydown', onPageUpDownSelectionHandler);
    window.document.body.addEventListener('keydown', disableNativeSelectAll);
    function createKernelContext() {
        return Object.freeze({
            onDidReceiveKernelMessage: onDidReceiveKernelMessage.event,
            postKernelMessage: (data) => postNotebookMessage('customKernelMessage', { message: data }),
        });
    }
    async function runKernelPreload(url) {
        try {
            return await activateModuleKernelPreload(url);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    async function activateModuleKernelPreload(url) {
        const module = await __import(url);
        if (!module.activate) {
            console.error(`Notebook preload '${url}' was expected to be a module but it does not export an 'activate' function`);
            return;
        }
        return module.activate(createKernelContext());
    }
    const dimensionUpdater = new class {
        constructor() {
            this.pending = new Map();
        }
        updateHeight(id, height, options) {
            if (!this.pending.size) {
                setTimeout(() => {
                    this.updateImmediately();
                }, 0);
            }
            const update = this.pending.get(id);
            if (update && update.isOutput) {
                this.pending.set(id, {
                    id,
                    height,
                    init: update.init,
                    isOutput: update.isOutput
                });
            }
            else {
                this.pending.set(id, {
                    id,
                    height,
                    ...options,
                });
            }
        }
        updateImmediately() {
            if (!this.pending.size) {
                return;
            }
            postNotebookMessage('dimension', {
                updates: Array.from(this.pending.values())
            });
            this.pending.clear();
        }
    };
    function elementHasContent(height) {
        // we need to account for a potential 1px top and bottom border on a child within the output container
        return height > 2.1;
    }
    const resizeObserver = new class {
        constructor() {
            this._observedElements = new WeakMap();
            this._observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (!window.document.body.contains(entry.target)) {
                        continue;
                    }
                    const observedElementInfo = this._observedElements.get(entry.target);
                    if (!observedElementInfo) {
                        continue;
                    }
                    this.postResizeMessage(observedElementInfo.cellId);
                    if (entry.target.id !== observedElementInfo.id) {
                        continue;
                    }
                    if (!entry.contentRect) {
                        continue;
                    }
                    if (!observedElementInfo.output) {
                        // markup, update directly
                        this.updateHeight(observedElementInfo, entry.target.offsetHeight);
                        continue;
                    }
                    const hasContent = elementHasContent(entry.contentRect.height);
                    const shouldUpdatePadding = (hasContent && observedElementInfo.lastKnownPadding === 0) ||
                        (!hasContent && observedElementInfo.lastKnownPadding !== 0);
                    if (shouldUpdatePadding) {
                        // Do not update dimension in resize observer
                        window.requestAnimationFrame(() => {
                            if (hasContent) {
                                entry.target.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}px`;
                            }
                            else {
                                entry.target.style.padding = `0px`;
                            }
                            this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                        });
                    }
                    else {
                        this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                    }
                }
            });
        }
        updateHeight(observedElementInfo, offsetHeight) {
            if (observedElementInfo.lastKnownHeight !== offsetHeight) {
                observedElementInfo.lastKnownHeight = offsetHeight;
                dimensionUpdater.updateHeight(observedElementInfo.id, offsetHeight, {
                    isOutput: observedElementInfo.output
                });
            }
        }
        observe(container, id, output, cellId) {
            if (this._observedElements.has(container)) {
                return;
            }
            this._observedElements.set(container, { id, output, lastKnownPadding: ctx.style.outputNodePadding, lastKnownHeight: -1, cellId });
            this._observer.observe(container);
        }
        postResizeMessage(cellId) {
            // Debounce this callback to only happen after
            // 250 ms. Don't need resize events that often.
            clearTimeout(this._outputResizeTimer);
            this._outputResizeTimer = setTimeout(() => {
                postNotebookMessage('outputResized', {
                    cellId
                });
            }, 250);
        }
    };
    let previousDelta;
    let scrollTimeout;
    let scrolledElement;
    let lastTimeScrolled;
    function flagRecentlyScrolled(node, deltaY) {
        scrolledElement = node;
        if (deltaY === undefined) {
            lastTimeScrolled = Date.now();
            previousDelta = undefined;
            node.setAttribute('recentlyScrolled', 'true');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 300);
            return true;
        }
        if (node.hasAttribute('recentlyScrolled')) {
            if (lastTimeScrolled && Date.now() - lastTimeScrolled > 400) {
                // it has been a while since we actually scrolled
                // if scroll velocity increases significantly, it's likely a new scroll event
                if (!!previousDelta && deltaY < 0 && deltaY < previousDelta - 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                else if (!!previousDelta && deltaY > 0 && deltaY > previousDelta + 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                // the tail end of a smooth scrolling event (from a trackpad) can go on for a while
                // so keep swallowing it, but we can shorten the timeout since the events occur rapidly
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 50);
            }
            else {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 300);
            }
            previousDelta = deltaY;
            return true;
        }
        return false;
    }
    function eventTargetShouldHandleScroll(event) {
        for (let node = event.target; node; node = node.parentNode) {
            if (!(node instanceof Element) || node.id === 'container' || node.classList.contains('cell_container') || node.classList.contains('markup') || node.classList.contains('output_container')) {
                return false;
            }
            // scroll up
            if (event.deltaY < 0 && node.scrollTop > 0) {
                // there is still some content to scroll
                flagRecentlyScrolled(node);
                return true;
            }
            // scroll down
            if (event.deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
                // per https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
                // scrollTop is not rounded but scrollHeight and clientHeight are
                // so we need to check if the difference is less than some threshold
                if (node.scrollHeight - node.scrollTop - node.clientHeight < 2) {
                    continue;
                }
                // if the node is not scrollable, we can continue. We don't check the computed style always as it's expensive
                if (window.getComputedStyle(node).overflowY === 'hidden' || window.getComputedStyle(node).overflowY === 'visible') {
                    continue;
                }
                flagRecentlyScrolled(node);
                return true;
            }
            if (flagRecentlyScrolled(node, event.deltaY)) {
                return true;
            }
        }
        return false;
    }
    const handleWheel = (event) => {
        if (event.defaultPrevented || eventTargetShouldHandleScroll(event)) {
            return;
        }
        postNotebookMessage('did-scroll-wheel', {
            payload: {
                deltaMode: event.deltaMode,
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaZ: event.deltaZ,
                // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                wheelDelta: event.wheelDelta && isChrome ? (event.wheelDelta / window.devicePixelRatio) : event.wheelDelta,
                wheelDeltaX: event.wheelDeltaX && isChrome ? (event.wheelDeltaX / window.devicePixelRatio) : event.wheelDeltaX,
                wheelDeltaY: event.wheelDeltaY && isChrome ? (event.wheelDeltaY / window.devicePixelRatio) : event.wheelDeltaY,
                detail: event.detail,
                shiftKey: event.shiftKey,
                type: event.type
            }
        });
    };
    function focusFirstFocusableOrContainerInOutput(cellOrOutputId, alternateId) {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId) ??
            (alternateId ? window.document.getElementById(alternateId) : undefined);
        if (cellOutputContainer) {
            if (cellOutputContainer.contains(window.document.activeElement)) {
                return;
            }
            const id = cellOutputContainer.id;
            let focusableElement = cellOutputContainer.querySelector('[tabindex="0"], [href], button, input, option, select, textarea');
            if (!focusableElement) {
                focusableElement = cellOutputContainer;
                focusableElement.tabIndex = -1;
                postNotebookMessage('outputInputFocus', { inputFocused: false, id });
            }
            else {
                const inputFocused = isEditableElement(focusableElement);
                postNotebookMessage('outputInputFocus', { inputFocused, id });
            }
            lastFocusedOutput = cellOutputContainer;
            postNotebookMessage('outputFocus', { id: cellOutputContainer.id });
            focusableElement.focus();
        }
    }
    function createFocusSink(cellId, focusNext) {
        const element = document.createElement('div');
        element.id = `focus-sink-${cellId}`;
        element.tabIndex = 0;
        element.addEventListener('focus', () => {
            postNotebookMessage('focus-editor', {
                cellId: cellId,
                focusNext
            });
        });
        return element;
    }
    function _internalHighlightRange(range, tagName = 'mark', attributes = {}) {
        // derived from https://github.com/Treora/dom-highlight-range/blob/master/highlight-range.js
        // Return an array of the text nodes in the range. Split the start and end nodes if required.
        function _textNodesInRange(range) {
            if (!range.startContainer.ownerDocument) {
                return [];
            }
            // If the start or end node is a text node and only partly in the range, split it.
            if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
                const startContainer = range.startContainer;
                const endOffset = range.endOffset; // (this may get lost when the splitting the node)
                const createdNode = startContainer.splitText(range.startOffset);
                if (range.endContainer === startContainer) {
                    // If the end was in the same container, it will now be in the newly created node.
                    range.setEnd(createdNode, endOffset - range.startOffset);
                }
                range.setStart(createdNode, 0);
            }
            if (range.endContainer.nodeType === Node.TEXT_NODE
                && range.endOffset < range.endContainer.length) {
                range.endContainer.splitText(range.endOffset);
            }
            // Collect the text nodes.
            const walker = range.startContainer.ownerDocument.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, node => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
            walker.currentNode = range.startContainer;
            // // Optimise by skipping nodes that are explicitly outside the range.
            // const NodeTypesWithCharacterOffset = [
            //  Node.TEXT_NODE,
            //  Node.PROCESSING_INSTRUCTION_NODE,
            //  Node.COMMENT_NODE,
            // ];
            // if (!NodeTypesWithCharacterOffset.includes(range.startContainer.nodeType)) {
            //   if (range.startOffset < range.startContainer.childNodes.length) {
            //     walker.currentNode = range.startContainer.childNodes[range.startOffset];
            //   } else {
            //     walker.nextSibling(); // TODO verify this is correct.
            //   }
            // }
            const nodes = [];
            if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                nodes.push(walker.currentNode);
            }
            while (walker.nextNode() && range.comparePoint(walker.currentNode, 0) !== 1) {
                if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                    nodes.push(walker.currentNode);
                }
            }
            return nodes;
        }
        // Replace [node] with <tagName ...attributes>[node]</tagName>
        function wrapNodeInHighlight(node, tagName, attributes) {
            const highlightElement = node.ownerDocument.createElement(tagName);
            Object.keys(attributes).forEach(key => {
                highlightElement.setAttribute(key, attributes[key]);
            });
            const tempRange = node.ownerDocument.createRange();
            tempRange.selectNode(node);
            tempRange.surroundContents(highlightElement);
            return highlightElement;
        }
        if (range.collapsed) {
            return {
                remove: () => { },
                update: () => { }
            };
        }
        // First put all nodes in an array (splits start and end nodes if needed)
        const nodes = _textNodesInRange(range);
        // Highlight each node
        const highlightElements = [];
        for (const nodeIdx in nodes) {
            const highlightElement = wrapNodeInHighlight(nodes[nodeIdx], tagName, attributes);
            highlightElements.push(highlightElement);
        }
        // Remove a highlight element created with wrapNodeInHighlight.
        function _removeHighlight(highlightElement) {
            if (highlightElement.childNodes.length === 1) {
                highlightElement.parentNode?.replaceChild(highlightElement.firstChild, highlightElement);
            }
            else {
                // If the highlight somehow contains multiple nodes now, move them all.
                while (highlightElement.firstChild) {
                    highlightElement.parentNode?.insertBefore(highlightElement.firstChild, highlightElement);
                }
                highlightElement.remove();
            }
        }
        // Return a function that cleans up the highlightElements.
        function _removeHighlights() {
            // Remove each of the created highlightElements.
            for (const highlightIdx in highlightElements) {
                _removeHighlight(highlightElements[highlightIdx]);
            }
        }
        function _updateHighlight(highlightElement, attributes = {}) {
            Object.keys(attributes).forEach(key => {
                highlightElement.setAttribute(key, attributes[key]);
            });
        }
        function updateHighlights(attributes) {
            for (const highlightIdx in highlightElements) {
                _updateHighlight(highlightElements[highlightIdx], attributes);
            }
        }
        return {
            remove: _removeHighlights,
            update: updateHighlights
        };
    }
    function selectRange(_range) {
        const sel = window.getSelection();
        if (sel) {
            try {
                sel.removeAllRanges();
                const r = document.createRange();
                r.setStart(_range.startContainer, _range.startOffset);
                r.setEnd(_range.endContainer, _range.endOffset);
                sel.addRange(r);
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    function highlightRange(range, useCustom, tagName = 'mark', attributes = {}) {
        if (useCustom) {
            const ret = _internalHighlightRange(range, tagName, attributes);
            return {
                range: range,
                dispose: ret.remove,
                update: (color, className) => {
                    if (className === undefined) {
                        ret.update({
                            'style': `background-color: ${color}`
                        });
                    }
                    else {
                        ret.update({
                            'class': className
                        });
                    }
                }
            };
        }
        else {
            window.document.execCommand('hiliteColor', false, matchColor);
            const cloneRange = window.getSelection().getRangeAt(0).cloneRange();
            const _range = {
                collapsed: cloneRange.collapsed,
                commonAncestorContainer: cloneRange.commonAncestorContainer,
                endContainer: cloneRange.endContainer,
                endOffset: cloneRange.endOffset,
                startContainer: cloneRange.startContainer,
                startOffset: cloneRange.startOffset
            };
            return {
                range: _range,
                dispose: () => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                },
                update: (color, className) => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        window.document.execCommand('hiliteColor', false, color);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            };
        }
    }
    function createEmitter(listenerChange = () => undefined) {
        const listeners = new Set();
        return {
            fire(data) {
                for (const listener of [...listeners]) {
                    listener.fn.call(listener.thisArg, data);
                }
            },
            event(fn, thisArg, disposables) {
                const listenerObj = { fn, thisArg };
                const disposable = {
                    dispose: () => {
                        listeners.delete(listenerObj);
                        listenerChange(listeners);
                    },
                };
                listeners.add(listenerObj);
                listenerChange(listeners);
                if (disposables instanceof Array) {
                    disposables.push(disposable);
                }
                else if (disposables) {
                    disposables.add(disposable);
                }
                return disposable;
            },
        };
    }
    function showRenderError(errorText, outputNode, errors) {
        outputNode.innerText = errorText;
        const errList = document.createElement('ul');
        for (const result of errors) {
            console.error(result);
            const item = document.createElement('li');
            item.innerText = result.message;
            errList.appendChild(item);
        }
        outputNode.appendChild(errList);
    }
    const outputItemRequests = new class {
        constructor() {
            this._requestPool = 0;
            this._requests = new Map();
        }
        getOutputItem(outputId, mime) {
            const requestId = this._requestPool++;
            const { promise, resolve } = promiseWithResolvers();
            this._requests.set(requestId, { resolve });
            postNotebookMessage('getOutputItem', { requestId, outputId, mime });
            return promise;
        }
        resolveOutputItem(requestId, output) {
            const request = this._requests.get(requestId);
            if (!request) {
                return;
            }
            this._requests.delete(requestId);
            request.resolve(output);
        }
    };
    let hasWarnedAboutAllOutputItemsProposal = false;
    function createOutputItem(id, mime, metadata, valueBytes, allOutputItemData, appended) {
        function create(id, mime, metadata, valueBytes, appended) {
            return Object.freeze({
                id,
                mime,
                metadata,
                appendedText() {
                    if (appended) {
                        return textDecoder.decode(appended.valueBytes);
                    }
                    return undefined;
                },
                data() {
                    return valueBytes;
                },
                text() {
                    return textDecoder.decode(valueBytes);
                },
                json() {
                    return JSON.parse(this.text());
                },
                blob() {
                    return new Blob([valueBytes], { type: this.mime });
                },
                get _allOutputItems() {
                    if (!hasWarnedAboutAllOutputItemsProposal) {
                        hasWarnedAboutAllOutputItemsProposal = true;
                        console.warn(`'_allOutputItems' is proposed API. DO NOT ship an extension that depends on it!`);
                    }
                    return allOutputItemList;
                },
            });
        }
        const allOutputItemCache = new Map();
        const allOutputItemList = Object.freeze(allOutputItemData.map(outputItem => {
            const mime = outputItem.mime;
            return Object.freeze({
                mime,
                getItem() {
                    const existingTask = allOutputItemCache.get(mime);
                    if (existingTask) {
                        return existingTask;
                    }
                    const task = outputItemRequests.getOutputItem(id, mime).then(item => {
                        return item ? create(id, item.mime, metadata, item.valueBytes) : undefined;
                    });
                    allOutputItemCache.set(mime, task);
                    return task;
                }
            });
        }));
        const item = create(id, mime, metadata, valueBytes, appended);
        allOutputItemCache.set(mime, Promise.resolve(item));
        return item;
    }
    const onDidReceiveKernelMessage = createEmitter();
    const ttPolicy = window.trustedTypes?.createPolicy('notebookRenderer', {
        createHTML: value => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
        createScript: value => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
    });
    window.addEventListener('wheel', handleWheel);
    const matchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).color;
    const currentMatchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).backgroundColor;
    class JSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
        }
        addHighlights(matches, ownerID) {
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                const ret = highlightRange(match.originalRange, true, 'mark', match.isShadow ? {
                    'style': 'background-color: ' + matchColor + ';',
                } : {
                    'class': 'find-match'
                });
                match.highlightResult = ret;
            }
            const highlightInfo = {
                matches,
                currentMatchIndex: -1
            };
            this._activeHighlightInfo.set(ownerID, highlightInfo);
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.get(ownerID)?.matches.forEach(match => {
                match.highlightResult?.dispose();
            });
            this._activeHighlightInfo.delete(ownerID);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            const oldMatch = highlightInfo.matches[highlightInfo.currentMatchIndex];
            oldMatch?.highlightResult?.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            const match = highlightInfo.matches[index];
            highlightInfo.currentMatchIndex = index;
            const sel = window.getSelection();
            if (!!match && !!sel && match.highlightResult) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    const tempRange = document.createRange();
                    tempRange.selectNode(match.highlightResult.range.startContainer);
                    match.highlightResult.range.startContainer.parentElement?.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
                    const rangeOffset = tempRange.getBoundingClientRect().top;
                    tempRange.detach();
                    offset = rangeOffset - outputOffset;
                }
                catch (e) {
                    console.error(e);
                }
                match.highlightResult?.update(currentMatchColor, match.isShadow ? undefined : 'current-find-match');
                window.document.getSelection()?.removeAllRanges();
                postNotebookMessage('didFindHighlightCurrent', {
                    offset
                });
            }
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            const oldMatch = highlightInfo.matches[index];
            if (oldMatch && oldMatch.highlightResult) {
                oldMatch.highlightResult.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            }
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._activeHighlightInfo.forEach(highlightInfo => {
                highlightInfo.matches.forEach(match => {
                    match.highlightResult?.dispose();
                });
            });
        }
    }
    class CSSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
            this._matchesHighlight = new Highlight();
            this._matchesHighlight.priority = 1;
            this._currentMatchesHighlight = new Highlight();
            this._currentMatchesHighlight.priority = 2;
            CSS.highlights?.set(`find-highlight`, this._matchesHighlight);
            CSS.highlights?.set(`current-find-highlight`, this._currentMatchesHighlight);
        }
        _refreshRegistry(updateMatchesHighlight = true) {
            // for performance reasons, only update the full list of highlights when we need to
            if (updateMatchesHighlight) {
                this._matchesHighlight.clear();
            }
            this._currentMatchesHighlight.clear();
            this._activeHighlightInfo.forEach((highlightInfo) => {
                if (updateMatchesHighlight) {
                    for (let i = 0; i < highlightInfo.matches.length; i++) {
                        this._matchesHighlight.add(highlightInfo.matches[i].originalRange);
                    }
                }
                if (highlightInfo.currentMatchIndex < highlightInfo.matches.length && highlightInfo.currentMatchIndex >= 0) {
                    this._currentMatchesHighlight.add(highlightInfo.matches[highlightInfo.currentMatchIndex].originalRange);
                }
            });
        }
        addHighlights(matches, ownerID) {
            for (let i = 0; i < matches.length; i++) {
                this._matchesHighlight.add(matches[i].originalRange);
            }
            const newEntry = {
                matches,
                currentMatchIndex: -1,
            };
            this._activeHighlightInfo.set(ownerID, newEntry);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            highlightInfo.currentMatchIndex = index;
            const match = highlightInfo.matches[index];
            if (match) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    match.originalRange.startContainer.parentElement?.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
                    const rangeOffset = match.originalRange.getBoundingClientRect().top;
                    offset = rangeOffset - outputOffset;
                    postNotebookMessage('didFindHighlightCurrent', {
                        offset
                    });
                }
                catch (e) {
                    console.error(e);
                }
            }
            this._refreshRegistry(false);
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            highlightInfo.currentMatchIndex = -1;
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.delete(ownerID);
            this._refreshRegistry();
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._currentMatchesHighlight.clear();
            this._matchesHighlight.clear();
        }
    }
    const _highlighter = (CSS.highlights) ? new CSSHighlighter() : new JSHighlighter();
    function extractSelectionLine(selection) {
        const range = selection.getRangeAt(0);
        // we need to keep a reference to the old selection range to re-apply later
        const oldRange = range.cloneRange();
        const captureLength = selection.toString().length;
        // use selection API to modify selection to get entire line (the first line if multi-select)
        // collapse selection to start so that the cursor position is at beginning of match
        selection.collapseToStart();
        // extend selection in both directions to select the line
        selection.modify('move', 'backward', 'lineboundary');
        selection.modify('extend', 'forward', 'lineboundary');
        const line = selection.toString();
        // using the original range and the new range, we can find the offset of the match from the line start.
        const rangeStart = getStartOffset(selection.getRangeAt(0), oldRange);
        // line range for match
        const lineRange = {
            start: rangeStart,
            end: rangeStart + captureLength,
        };
        // re-add the old range so that the selection is restored
        selection.removeAllRanges();
        selection.addRange(oldRange);
        return { line, range: lineRange };
    }
    function getStartOffset(lineRange, originalRange) {
        // sometimes, the old and new range are in different DOM elements (ie: when the match is inside of <b></b>)
        // so we need to find the first common ancestor DOM element and find the positions of the old and new range relative to that.
        const firstCommonAncestor = findFirstCommonAncestor(lineRange.startContainer, originalRange.startContainer);
        const selectionOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, lineRange.startContainer) + lineRange.startOffset;
        const textOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, originalRange.startContainer) + originalRange.startOffset;
        return textOffset - selectionOffset;
    }
    // modified from https://stackoverflow.com/a/68583466/16253823
    function findFirstCommonAncestor(nodeA, nodeB) {
        const range = new Range();
        range.setStart(nodeA, 0);
        range.setEnd(nodeB, 0);
        return range.commonAncestorContainer;
    }
    function getTextContentLength(node) {
        let length = 0;
        if (node.nodeType === Node.TEXT_NODE) {
            length += node.textContent?.length || 0;
        }
        else {
            for (const childNode of node.childNodes) {
                length += getTextContentLength(childNode);
            }
        }
        return length;
    }
    // modified from https://stackoverflow.com/a/48812529/16253823
    function getSelectionOffsetRelativeTo(parentElement, currentNode) {
        if (!currentNode) {
            return 0;
        }
        let offset = 0;
        if (currentNode === parentElement || !parentElement.contains(currentNode)) {
            return offset;
        }
        // count the number of chars before the current dom elem and the start of the dom
        let prevSibling = currentNode.previousSibling;
        while (prevSibling) {
            offset += getTextContentLength(prevSibling);
            prevSibling = prevSibling.previousSibling;
        }
        return offset + getSelectionOffsetRelativeTo(parentElement, currentNode.parentNode);
    }
    const find = (query, options) => {
        let find = true;
        let matches = [];
        const range = document.createRange();
        range.selectNodeContents(window.document.getElementById('findStart'));
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        viewModel.toggleDragDropEnabled(false);
        try {
            document.designMode = 'On';
            while (find && matches.length < 500) {
                find = window.find(query, /* caseSensitive*/ !!options.caseSensitive, 
                /* backwards*/ false, 
                /* wrapAround*/ false, 
                /* wholeWord */ !!options.wholeWord, 
                /* searchInFrames*/ true, false);
                if (find) {
                    const selection = window.getSelection();
                    if (!selection) {
                        console.log('no selection');
                        break;
                    }
                    // Markdown preview are rendered in a shadow DOM.
                    if (options.includeMarkup && selection.rangeCount > 0 && selection.getRangeAt(0).startContainer.nodeType === 1
                        && selection.getRangeAt(0).startContainer.classList.contains('markup')) {
                        // markdown preview container
                        const preview = selection.anchorNode?.firstChild;
                        const root = preview.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        // find the match in the shadow dom by checking the selection inside the shadow dom
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'preview',
                                id: preview.id,
                                cellId: preview.id,
                                container: preview,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(shadowSelection) : undefined,
                            });
                        }
                    }
                    // Outputs might be rendered inside a shadow DOM.
                    if (options.includeOutput && selection.rangeCount > 0 && selection.getRangeAt(0).startContainer.nodeType === 1
                        && selection.getRangeAt(0).startContainer.classList.contains('output_container')) {
                        // output container
                        const cellId = selection.getRangeAt(0).startContainer.parentElement.id;
                        const outputNode = selection.anchorNode?.firstChild;
                        const root = outputNode.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'output',
                                id: outputNode.id,
                                cellId: cellId,
                                container: outputNode,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(shadowSelection) : undefined,
                            });
                        }
                    }
                    const anchorNode = selection.anchorNode?.parentElement;
                    if (anchorNode) {
                        const lastEl = matches.length ? matches[matches.length - 1] : null;
                        // Optimization: avoid searching for the output container
                        if (lastEl && lastEl.container.contains(anchorNode) && options.includeOutput) {
                            matches.push({
                                type: lastEl.type,
                                id: lastEl.id,
                                cellId: lastEl.cellId,
                                container: lastEl.container,
                                isShadow: false,
                                originalRange: selection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(selection) : undefined,
                            });
                        }
                        else {
                            // Traverse up the DOM to find the container
                            for (let node = anchorNode; node; node = node.parentElement) {
                                if (!(node instanceof Element)) {
                                    break;
                                }
                                if (node.classList.contains('output') && options.includeOutput) {
                                    // inside output
                                    const cellId = node.parentElement?.parentElement?.id;
                                    if (cellId) {
                                        matches.push({
                                            type: 'output',
                                            id: node.id,
                                            cellId: cellId,
                                            container: node,
                                            isShadow: false,
                                            originalRange: selection.getRangeAt(0),
                                            searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(selection) : undefined,
                                        });
                                    }
                                    break;
                                }
                                if (node.id === 'container' || node === window.document.body) {
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        break;
                    }
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        matches = matches.filter(match => options.findIds.length ? options.findIds.includes(match.cellId) : true);
        _highlighter.addHighlights(matches, options.ownerID);
        window.document.getSelection()?.removeAllRanges();
        viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
        document.designMode = 'Off';
        postNotebookMessage('didFind', {
            matches: matches.map((match, index) => ({
                type: match.type,
                id: match.id,
                cellId: match.cellId,
                index,
                searchPreviewInfo: match.searchPreviewInfo,
            }))
        });
    };
    const copyOutputImage = async (outputId, altOutputId, textAlternates, retries = 5) => {
        if (!window.document.hasFocus() && retries > 0) {
            // copyImage can be called from outside of the webview, which means this function may be running whilst the webview is gaining focus.
            // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
            // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
            setTimeout(() => { copyOutputImage(outputId, altOutputId, textAlternates, retries - 1); }, 50);
            return;
        }
        try {
            const outputElement = window.document.getElementById(outputId)
                ?? window.document.getElementById(altOutputId);
            let image = outputElement?.querySelector('img');
            if (!image) {
                const svgImage = outputElement?.querySelector('svg.output-image') ??
                    outputElement?.querySelector('div.svgContainerStyle > svg');
                if (svgImage) {
                    image = new Image();
                    image.src = 'data:image/svg+xml,' + encodeURIComponent(svgImage.outerHTML);
                }
            }
            if (image) {
                const imageToCopy = image;
                // Build clipboard data with both image and text formats
                const clipboardData = {
                    'image/png': new Promise((resolve) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = imageToCopy.naturalWidth;
                        canvas.height = imageToCopy.naturalHeight;
                        const context = canvas.getContext('2d');
                        context.drawImage(imageToCopy, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(blob);
                            }
                            else {
                                console.error('No blob data to write to clipboard');
                            }
                            canvas.remove();
                        }, 'image/png');
                    })
                };
                // Add text alternates if provided
                if (textAlternates) {
                    for (const alternate of textAlternates) {
                        clipboardData[alternate.mimeType] = alternate.content;
                    }
                }
                await navigator.clipboard.write([new ClipboardItem(clipboardData)]);
            }
            else {
                console.error('Could not find image element to copy for output with id', outputId);
            }
        }
        catch (e) {
            console.error('Could not copy image:', e);
        }
    };
    window.addEventListener('message', async (rawEvent) => {
        const event = rawEvent;
        switch (event.data.type) {
            case 'initializeMarkup': {
                try {
                    await Promise.all(event.data.cells.map(info => viewModel.ensureMarkupCell(info)));
                }
                finally {
                    dimensionUpdater.updateImmediately();
                    postNotebookMessage('initializedMarkup', { requestId: event.data.requestId });
                }
                break;
            }
            case 'createMarkupCell':
                viewModel.ensureMarkupCell(event.data.cell);
                break;
            case 'showMarkupCell':
                viewModel.showMarkupCell(event.data.id, event.data.top, event.data.content, event.data.metadata);
                break;
            case 'hideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.hideMarkupCell(id);
                }
                break;
            case 'unhideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.unhideMarkupCell(id);
                }
                break;
            case 'deleteMarkupCell':
                for (const id of event.data.ids) {
                    viewModel.deleteMarkupCell(id);
                }
                break;
            case 'updateSelectedMarkupCells':
                viewModel.updateSelectedCells(event.data.selectedCellIds);
                break;
            case 'html': {
                const data = event.data;
                if (data.createOnIdle) {
                    outputRunner.enqueueIdle(data.outputId, signal => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                else {
                    outputRunner.enqueue(data.outputId, signal => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                break;
            }
            case 'view-scroll':
                {
                    // const date = new Date();
                    // console.log('----- will scroll ----  ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
                    event.data.widgets.forEach(widget => {
                        outputRunner.enqueue(widget.outputId, () => {
                            viewModel.updateOutputsScroll([widget]);
                        });
                    });
                    viewModel.updateMarkupScrolls(event.data.markupCells);
                    break;
                }
            case 'clear':
                renderers.clearAll();
                viewModel.clearAll();
                window.document.getElementById('container').innerText = '';
                break;
            case 'clearOutput': {
                const { cellId, rendererId, outputId } = event.data;
                outputRunner.cancelOutput(outputId);
                viewModel.clearOutput(cellId, outputId, rendererId);
                break;
            }
            case 'hideOutput': {
                const { cellId, outputId } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.hideOutput(cellId);
                });
                break;
            }
            case 'showOutput': {
                const { outputId, cellTop, cellId, content } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.showOutput(cellId, outputId, cellTop);
                    if (content) {
                        viewModel.updateAndRerender(cellId, outputId, content);
                    }
                });
                break;
            }
            case 'copyImage': {
                await copyOutputImage(event.data.outputId, event.data.altOutputId, event.data.textAlternates);
                break;
            }
            case 'ack-dimension': {
                for (const { cellId, outputId, height } of event.data.updates) {
                    viewModel.updateOutputHeight(cellId, outputId, height);
                }
                break;
            }
            case 'preload': {
                const resources = event.data.resources;
                for (const { uri } of resources) {
                    kernelPreloads.load(uri);
                }
                break;
            }
            case 'updateRenderers': {
                const { rendererData } = event.data;
                renderers.updateRendererData(rendererData);
                break;
            }
            case 'focus-output':
                focusFirstFocusableOrContainerInOutput(event.data.cellOrOutputId, event.data.alternateId);
                break;
            case 'blur-output':
                blurOutput();
                break;
            case 'select-output-contents':
                selectOutputContents(event.data.cellOrOutputId);
                break;
            case 'select-input-contents':
                selectInputContents(event.data.cellOrOutputId);
                break;
            case 'decorations': {
                let outputContainer = window.document.getElementById(event.data.cellId);
                if (!outputContainer) {
                    viewModel.ensureOutputCell(event.data.cellId, -100000, true);
                    outputContainer = window.document.getElementById(event.data.cellId);
                }
                outputContainer?.classList.add(...event.data.addedClassNames);
                outputContainer?.classList.remove(...event.data.removedClassNames);
                break;
            }
            case 'markupDecorations': {
                const markupCell = window.document.getElementById(event.data.cellId);
                // The cell may not have been added yet if it is out of view.
                // Decorations will be added when the cell is shown.
                if (markupCell) {
                    markupCell?.classList.add(...event.data.addedClassNames);
                    markupCell?.classList.remove(...event.data.removedClassNames);
                }
                break;
            }
            case 'customKernelMessage':
                onDidReceiveKernelMessage.fire(event.data.message);
                break;
            case 'customRendererMessage':
                renderers.getRenderer(event.data.rendererId)?.receiveMessage(event.data.message);
                break;
            case 'notebookStyles': {
                const documentStyle = window.document.documentElement.style;
                for (let i = documentStyle.length - 1; i >= 0; i--) {
                    const property = documentStyle[i];
                    // Don't remove properties that the webview might have added separately
                    if (property && property.startsWith('--notebook-')) {
                        documentStyle.removeProperty(property);
                    }
                }
                // Re-add new properties
                for (const [name, value] of Object.entries(event.data.styles)) {
                    documentStyle.setProperty(`--${name}`, value);
                }
                break;
            }
            case 'notebookOptions':
                currentOptions = event.data.options;
                viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
                currentRenderOptions = event.data.renderOptions;
                settingChange.fire(currentRenderOptions);
                break;
            case 'tokenizedCodeBlock': {
                const { codeBlockId, html } = event.data;
                MarkdownCodeBlock.highlightCodeBlock(codeBlockId, html);
                break;
            }
            case 'tokenizedStylesChanged': {
                tokenizationStyle.replaceSync(event.data.css);
                break;
            }
            case 'find': {
                _highlighter.removeHighlights(event.data.options.ownerID);
                find(event.data.query, event.data.options);
                break;
            }
            case 'findHighlightCurrent': {
                _highlighter?.highlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findUnHighlightCurrent': {
                _highlighter?.unHighlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findStop': {
                _highlighter.removeHighlights(event.data.ownerID);
                break;
            }
            case 'returnOutputItem': {
                outputItemRequests.resolveOutputItem(event.data.requestId, event.data.output);
            }
        }
    });
    const renderFallbackErrorName = 'vscode.fallbackToNextRenderer';
    class Renderer {
        constructor(data) {
            this.data = data;
            this._onMessageEvent = createEmitter();
        }
        receiveMessage(message) {
            this._onMessageEvent.fire(message);
        }
        async renderOutputItem(item, element, signal) {
            try {
                await this.load();
            }
            catch (e) {
                if (!signal.aborted) {
                    showRenderError(`Error loading renderer '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                }
                return;
            }
            if (!this._api) {
                if (!signal.aborted) {
                    showRenderError(`Renderer '${this.data.id}' does not implement renderOutputItem`, element, []);
                }
                return;
            }
            try {
                const renderStart = performance.now();
                await this._api.renderOutputItem(item, element, signal);
                this.postDebugMessage('Rendered output item', { id: item.id, duration: `${performance.now() - renderStart}ms` });
            }
            catch (e) {
                if (signal.aborted) {
                    return;
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    throw e;
                }
                showRenderError(`Error rendering output item using '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                this.postDebugMessage('Rendering output item failed', { id: item.id, error: e + '' });
            }
        }
        disposeOutputItem(id) {
            this._api?.disposeOutputItem?.(id);
        }
        createRendererContext() {
            const { id, messaging } = this.data;
            const context = {
                setState: newState => vscode.setState({ ...vscode.getState(), [id]: newState }),
                getState: () => {
                    const state = vscode.getState();
                    return typeof state === 'object' && state ? state[id] : undefined;
                },
                getRenderer: async (id) => {
                    const renderer = renderers.getRenderer(id);
                    if (!renderer) {
                        return undefined;
                    }
                    if (renderer._api) {
                        return renderer._api;
                    }
                    return renderer.load();
                },
                workspace: {
                    get isTrusted() { return isWorkspaceTrusted; }
                },
                settings: {
                    get lineLimit() { return currentRenderOptions.lineLimit; },
                    get outputScrolling() { return currentRenderOptions.outputScrolling; },
                    get outputWordWrap() { return currentRenderOptions.outputWordWrap; },
                    get linkifyFilePaths() { return currentRenderOptions.linkifyFilePaths; },
                    get minimalError() { return currentRenderOptions.minimalError; },
                },
                get onDidChangeSettings() { return settingChange.event; }
            };
            if (messaging) {
                context.onDidReceiveMessage = this._onMessageEvent.event;
                context.postMessage = message => postNotebookMessage('customRendererMessage', { rendererId: id, message });
            }
            return Object.freeze(context);
        }
        load() {
            this._loadPromise ??= this._load();
            return this._loadPromise;
        }
        /** Inner function cached in the _loadPromise(). */
        async _load() {
            this.postDebugMessage('Start loading renderer');
            try {
                // Preloads need to be loaded before loading renderers.
                await kernelPreloads.waitForAllCurrent();
                const importStart = performance.now();
                const module = await __import(this.data.entrypoint.path);
                this.postDebugMessage('Imported renderer', { duration: `${performance.now() - importStart}ms` });
                if (!module) {
                    return;
                }
                this._api = await module.activate(this.createRendererContext());
                this.postDebugMessage('Activated renderer', { duration: `${performance.now() - importStart}ms` });
                const dependantRenderers = ctx.rendererData
                    .filter(d => d.entrypoint.extends === this.data.id);
                if (dependantRenderers.length) {
                    this.postDebugMessage('Activating dependant renderers', { dependents: dependantRenderers.map(x => x.id).join(', ') });
                }
                // Load all renderers that extend this renderer
                await Promise.all(dependantRenderers.map(async (d) => {
                    const renderer = renderers.getRenderer(d.id);
                    if (!renderer) {
                        throw new Error(`Could not find extending renderer: ${d.id}`);
                    }
                    try {
                        return await renderer.load();
                    }
                    catch (e) {
                        // Squash any errors extends errors. They won't prevent the renderer
                        // itself from working, so just log them.
                        console.error(e);
                        this.postDebugMessage('Activating dependant renderer failed', { dependent: d.id, error: e + '' });
                        return undefined;
                    }
                }));
                return this._api;
            }
            catch (e) {
                this.postDebugMessage('Loading renderer failed');
                throw e;
            }
        }
        postDebugMessage(msg, data) {
            postNotebookMessage('logRendererDebugMessage', {
                message: `[renderer ${this.data.id}] - ${msg}`,
                data
            });
        }
    }
    const kernelPreloads = new class {
        constructor() {
            this.preloads = new Map();
        }
        /**
         * Returns a promise that resolves when the given preload is activated.
         */
        waitFor(uri) {
            return this.preloads.get(uri) || Promise.resolve(new Error(`Preload not ready: ${uri}`));
        }
        /**
         * Loads a preload.
         * @param uri URI to load from
         * @param originalUri URI to show in an error message if the preload is invalid.
         */
        load(uri) {
            const promise = Promise.all([
                runKernelPreload(uri),
                this.waitForAllCurrent(),
            ]);
            this.preloads.set(uri, promise);
            return promise;
        }
        /**
         * Returns a promise that waits for all currently-registered preloads to
         * activate before resolving.
         */
        waitForAllCurrent() {
            return Promise.all([...this.preloads.values()].map(p => p.catch(err => err)));
        }
    };
    const outputRunner = new class {
        constructor() {
            this.outputs = new Map();
            this.pendingOutputCreationRequest = new Map();
        }
        /**
         * Pushes the action onto the list of actions for the given output ID,
         * ensuring that it's run in-order.
         */
        enqueue(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const record = this.outputs.get(outputId);
            if (!record) {
                const controller = new AbortController();
                this.outputs.set(outputId, { abort: controller, queue: new Promise(r => r(action(controller.signal))) });
            }
            else {
                record.queue = record.queue.then(async (r) => {
                    if (!record.abort.signal.aborted) {
                        await action(record.abort.signal);
                    }
                });
            }
        }
        enqueueIdle(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            outputRunner.pendingOutputCreationRequest.set(outputId, runWhenIdle(() => {
                outputRunner.enqueue(outputId, action);
                outputRunner.pendingOutputCreationRequest.delete(outputId);
            }));
        }
        /**
         * Cancels the rendering of all outputs.
         */
        cancelAll() {
            // Delete all pending idle requests
            this.pendingOutputCreationRequest.forEach(r => r.dispose());
            this.pendingOutputCreationRequest.clear();
            for (const { abort } of this.outputs.values()) {
                abort.abort();
            }
            this.outputs.clear();
        }
        /**
         * Cancels any ongoing rendering out an output.
         */
        cancelOutput(outputId) {
            // Delete the pending idle request if it exists
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const output = this.outputs.get(outputId);
            if (output) {
                output.abort.abort();
                this.outputs.delete(outputId);
            }
        }
    };
    const renderers = new class {
        constructor() {
            this._renderers = new Map();
            for (const renderer of ctx.rendererData) {
                this.addRenderer(renderer);
            }
        }
        getRenderer(id) {
            return this._renderers.get(id);
        }
        rendererEqual(a, b) {
            if (a.id !== b.id || a.entrypoint.path !== b.entrypoint.path || a.entrypoint.extends !== b.entrypoint.extends || a.messaging !== b.messaging) {
                return false;
            }
            if (a.mimeTypes.length !== b.mimeTypes.length) {
                return false;
            }
            for (let i = 0; i < a.mimeTypes.length; i++) {
                if (a.mimeTypes[i] !== b.mimeTypes[i]) {
                    return false;
                }
            }
            return true;
        }
        updateRendererData(rendererData) {
            const oldKeys = new Set(this._renderers.keys());
            const newKeys = new Set(rendererData.map(d => d.id));
            for (const renderer of rendererData) {
                const existing = this._renderers.get(renderer.id);
                if (existing && this.rendererEqual(existing.data, renderer)) {
                    continue;
                }
                this.addRenderer(renderer);
            }
            for (const key of oldKeys) {
                if (!newKeys.has(key)) {
                    this._renderers.delete(key);
                }
            }
        }
        addRenderer(renderer) {
            this._renderers.set(renderer.id, new Renderer(renderer));
        }
        clearAll() {
            outputRunner.cancelAll();
            for (const renderer of this._renderers.values()) {
                renderer.disposeOutputItem();
            }
        }
        clearOutput(rendererId, outputId) {
            outputRunner.cancelOutput(outputId);
            this._renderers.get(rendererId)?.disposeOutputItem(outputId);
        }
        async render(item, preferredRendererId, element, signal) {
            const primaryRenderer = this.findRenderer(preferredRendererId, item);
            if (!primaryRenderer) {
                const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-not-found-error') || '').replace('$0', () => item.mime);
                this.showRenderError(item, element, errorMessage);
                return;
            }
            // Try primary renderer first
            if (!(await this._doRender(item, element, primaryRenderer, signal)).continue) {
                return;
            }
            // Primary renderer failed in an expected way. Fallback to render the next mime types
            for (const additionalItemData of item._allOutputItems) {
                if (additionalItemData.mime === item.mime) {
                    continue;
                }
                const additionalItem = await additionalItemData.getItem();
                if (signal.aborted) {
                    return;
                }
                if (additionalItem) {
                    const renderer = this.findRenderer(undefined, additionalItem);
                    if (renderer) {
                        if (!(await this._doRender(additionalItem, element, renderer, signal)).continue) {
                            return; // We rendered successfully
                        }
                    }
                }
            }
            // All renderers have failed and there is nothing left to fallback to
            const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-fallbacks-exhausted') || '').replace('$0', () => item.mime);
            this.showRenderError(item, element, errorMessage);
        }
        async _doRender(item, element, renderer, signal) {
            try {
                await renderer.renderOutputItem(item, element, signal);
                return { continue: false }; // We rendered successfully
            }
            catch (e) {
                if (signal.aborted) {
                    return { continue: false };
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    return { continue: true };
                }
                else {
                    throw e; // Bail and let callers handle unknown errors
                }
            }
        }
        findRenderer(preferredRendererId, info) {
            let renderer;
            if (typeof preferredRendererId === 'string') {
                renderer = Array.from(this._renderers.values())
                    .find((renderer) => renderer.data.id === preferredRendererId);
            }
            else {
                const renderers = Array.from(this._renderers.values())
                    .filter((renderer) => renderer.data.mimeTypes.includes(info.mime) && !renderer.data.entrypoint.extends);
                if (renderers.length) {
                    // De-prioritize built-in renderers
                    renderers.sort((a, b) => +a.data.isBuiltin - +b.data.isBuiltin);
                    // Use first renderer we find in sorted list
                    renderer = renderers[0];
                }
            }
            return renderer;
        }
        showRenderError(info, element, errorMessage) {
            const errorContainer = document.createElement('div');
            const error = document.createElement('div');
            error.className = 'no-renderer-error';
            error.innerText = errorMessage;
            const cellText = document.createElement('div');
            cellText.innerText = info.text();
            errorContainer.appendChild(error);
            errorContainer.appendChild(cellText);
            element.innerText = '';
            element.appendChild(errorContainer);
        }
    }();
    const viewModel = new class ViewModel {
        constructor() {
            this._markupCells = new Map();
            this._outputCells = new Map();
        }
        clearAll() {
            for (const cell of this._markupCells.values()) {
                cell.dispose();
            }
            this._markupCells.clear();
            for (const output of this._outputCells.values()) {
                output.dispose();
            }
            this._outputCells.clear();
        }
        async createMarkupCell(init, top, visible) {
            const existing = this._markupCells.get(init.cellId);
            if (existing) {
                console.error(`Trying to create markup that already exists: ${init.cellId}`);
                return existing;
            }
            const cell = new MarkupCell(init.cellId, init.mime, init.content, top, init.metadata);
            cell.element.style.visibility = visible ? '' : 'hidden';
            this._markupCells.set(init.cellId, cell);
            await cell.ready;
            return cell;
        }
        async ensureMarkupCell(info) {
            let cell = this._markupCells.get(info.cellId);
            if (cell) {
                cell.element.style.visibility = info.visible ? '' : 'hidden';
                await cell.updateContentAndRender(info.content, info.metadata);
            }
            else {
                cell = await this.createMarkupCell(info, info.offset, info.visible);
            }
        }
        deleteMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            if (cell) {
                cell.remove();
                cell.dispose();
                this._markupCells.delete(id);
            }
        }
        async updateMarkupContent(id, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            await cell?.updateContentAndRender(newContent, metadata);
        }
        showMarkupCell(id, top, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.show(top, newContent, metadata);
        }
        hideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.hide();
        }
        unhideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.unhide();
        }
        getExpectedMarkupCell(id) {
            const cell = this._markupCells.get(id);
            if (!cell) {
                console.log(`Could not find markup cell '${id}'`);
                return undefined;
            }
            return cell;
        }
        updateSelectedCells(selectedCellIds) {
            const selectedCellSet = new Set(selectedCellIds);
            for (const cell of this._markupCells.values()) {
                cell.setSelected(selectedCellSet.has(cell.id));
            }
        }
        toggleDragDropEnabled(dragAndDropEnabled) {
            for (const cell of this._markupCells.values()) {
                cell.toggleDragDropEnabled(dragAndDropEnabled);
            }
        }
        updateMarkupScrolls(markupCells) {
            for (const { id, top } of markupCells) {
                const cell = this._markupCells.get(id);
                if (cell) {
                    cell.element.style.top = `${top}px`;
                }
            }
        }
        async renderOutputCell(data, signal) {
            const preloadErrors = await Promise.all(data.requiredPreloads.map(p => kernelPreloads.waitFor(p.uri).then(() => undefined, err => err)));
            if (signal.aborted) {
                return;
            }
            const cellOutput = this.ensureOutputCell(data.cellId, data.cellTop, false);
            return cellOutput.renderOutputElement(data, preloadErrors, signal);
        }
        ensureOutputCell(cellId, cellTop, skipCellTopUpdateIfExist) {
            let cell = this._outputCells.get(cellId);
            const existed = !!cell;
            if (!cell) {
                cell = new OutputCell(cellId);
                this._outputCells.set(cellId, cell);
            }
            if (existed && skipCellTopUpdateIfExist) {
                return cell;
            }
            cell.element.style.top = cellTop + 'px';
            return cell;
        }
        clearOutput(cellId, outputId, rendererId) {
            const cell = this._outputCells.get(cellId);
            cell?.clearOutput(outputId, rendererId);
        }
        showOutput(cellId, outputId, top) {
            const cell = this._outputCells.get(cellId);
            cell?.show(outputId, top);
        }
        updateAndRerender(cellId, outputId, content) {
            const cell = this._outputCells.get(cellId);
            cell?.updateContentAndRerender(outputId, content);
        }
        hideOutput(cellId) {
            const cell = this._outputCells.get(cellId);
            cell?.hide();
        }
        updateOutputHeight(cellId, outputId, height) {
            const cell = this._outputCells.get(cellId);
            cell?.updateOutputHeight(outputId, height);
        }
        updateOutputsScroll(updates) {
            for (const request of updates) {
                const cell = this._outputCells.get(request.cellId);
                cell?.updateScroll(request);
            }
        }
    }();
    class MarkdownCodeBlock {
        static { this.pendingCodeBlocksToHighlight = new Map(); }
        static highlightCodeBlock(id, html) {
            const el = MarkdownCodeBlock.pendingCodeBlocksToHighlight.get(id);
            if (!el) {
                return;
            }
            const trustedHtml = ttPolicy?.createHTML(html) ?? html;
            el.innerHTML = trustedHtml; // CodeQL [SM03712] The rendered content comes from VS Code's tokenizer and is considered safe
            const root = el.getRootNode();
            if (root instanceof ShadowRoot) {
                if (!root.adoptedStyleSheets.includes(tokenizationStyle)) {
                    root.adoptedStyleSheets.push(tokenizationStyle);
                }
            }
        }
        static requestHighlightCodeBlock(root) {
            const codeBlocks = [];
            let i = 0;
            for (const el of root.querySelectorAll('.vscode-code-block')) {
                const lang = el.getAttribute('data-vscode-code-block-lang');
                if (el.textContent && lang) {
                    const id = `${Date.now()}-${i++}`;
                    codeBlocks.push({ value: el.textContent, lang: lang, id });
                    MarkdownCodeBlock.pendingCodeBlocksToHighlight.set(id, el);
                }
            }
            return codeBlocks;
        }
    }
    class MarkupCell {
        constructor(id, mime, content, top, metadata) {
            this._isDisposed = false;
            const self = this;
            this.id = id;
            this._content = { value: content, version: 0, metadata: metadata };
            const { promise, resolve, reject } = promiseWithResolvers();
            this.ready = promise;
            let cachedData;
            this.outputItem = Object.freeze({
                id,
                mime,
                get metadata() {
                    return self._content.metadata;
                },
                text: () => {
                    return this._content.value;
                },
                json: () => {
                    return undefined;
                },
                data: () => {
                    if (cachedData?.version === this._content.version) {
                        return cachedData.value;
                    }
                    const data = textEncoder.encode(this._content.value);
                    cachedData = { version: this._content.version, value: data };
                    return data;
                },
                blob() {
                    return new Blob([this.data()], { type: this.mime });
                },
                _allOutputItems: [{
                        mime,
                        getItem: async () => this.outputItem,
                    }]
            });
            const root = window.document.getElementById('container');
            const markupCell = document.createElement('div');
            markupCell.className = 'markup';
            markupCell.style.position = 'absolute';
            markupCell.style.width = '100%';
            this.element = document.createElement('div');
            this.element.id = this.id;
            this.element.classList.add('preview');
            this.element.style.position = 'absolute';
            this.element.style.top = top + 'px';
            this.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
            markupCell.appendChild(this.element);
            root.appendChild(markupCell);
            this.addEventListeners();
            this.updateContentAndRender(this._content.value, this._content.metadata).then(() => {
                if (!this._isDisposed) {
                    resizeObserver.observe(this.element, this.id, false, this.id);
                }
                resolve();
            }, () => reject());
        }
        dispose() {
            this._isDisposed = true;
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        addEventListeners() {
            this.element.addEventListener('dblclick', () => {
                postNotebookMessage('toggleMarkupPreview', { cellId: this.id });
            });
            this.element.addEventListener('click', e => {
                postNotebookMessage('clickMarkupCell', {
                    cellId: this.id,
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    shiftKey: e.shiftKey,
                });
            });
            this.element.addEventListener('contextmenu', e => {
                postNotebookMessage('contextMenuMarkupCell', {
                    cellId: this.id,
                    clientX: e.clientX,
                    clientY: e.clientY,
                });
            });
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseEnterMarkupCell', { cellId: this.id });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseLeaveMarkupCell', { cellId: this.id });
            });
            this.element.addEventListener('dragstart', e => {
                markupCellDragManager.startDrag(e, this.id);
            });
            this.element.addEventListener('drag', e => {
                markupCellDragManager.updateDrag(e, this.id);
            });
            this.element.addEventListener('dragend', e => {
                markupCellDragManager.endDrag(e, this.id);
            });
        }
        async updateContentAndRender(newContent, metadata) {
            this._content = { value: newContent, version: this._content.version + 1, metadata };
            this.renderTaskAbort?.abort();
            const controller = new AbortController();
            this.renderTaskAbort = controller;
            try {
                await renderers.render(this.outputItem, undefined, this.element, this.renderTaskAbort.signal);
            }
            finally {
                if (this.renderTaskAbort === controller) {
                    this.renderTaskAbort = undefined;
                }
            }
            const root = (this.element.shadowRoot ?? this.element);
            const html = [];
            for (const child of root.children) {
                switch (child.tagName) {
                    case 'LINK':
                    case 'SCRIPT':
                    case 'STYLE':
                        // not worth sending over since it will be stripped before rendering
                        break;
                    default:
                        html.push(child.outerHTML);
                        break;
                }
            }
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            postNotebookMessage('renderedMarkup', {
                cellId: this.id,
                html: html.join(''),
                codeBlocks
            });
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false
            });
        }
        show(top, newContent, metadata) {
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
            if (typeof newContent === 'string' || metadata) {
                this.updateContentAndRender(newContent ?? this._content.value, metadata ?? this._content.metadata);
            }
            else {
                this.updateMarkupDimensions();
            }
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        unhide() {
            this.element.style.visibility = '';
            this.updateMarkupDimensions();
        }
        remove() {
            this.element.remove();
        }
        async updateMarkupDimensions() {
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false
            });
        }
        setSelected(selected) {
            this.element.classList.toggle('selected', selected);
        }
        toggleDragDropEnabled(enabled) {
            if (enabled) {
                this.element.classList.add('draggable');
                this.element.setAttribute('draggable', 'true');
            }
            else {
                this.element.classList.remove('draggable');
                this.element.removeAttribute('draggable');
            }
        }
    }
    class OutputCell {
        constructor(cellId) {
            this.outputElements = new Map();
            const container = window.document.getElementById('container');
            const upperWrapperElement = createFocusSink(cellId);
            container.appendChild(upperWrapperElement);
            this.element = document.createElement('div');
            this.element.style.position = 'absolute';
            this.element.style.outline = '0';
            this.element.id = cellId;
            this.element.classList.add('cell_container');
            container.appendChild(this.element);
            this.element = this.element;
            const lowerWrapperElement = createFocusSink(cellId, true);
            container.appendChild(lowerWrapperElement);
        }
        dispose() {
            for (const output of this.outputElements.values()) {
                output.dispose();
            }
            this.outputElements.clear();
        }
        createOutputElement(data) {
            let outputContainer = this.outputElements.get(data.outputId);
            if (!outputContainer) {
                outputContainer = new OutputContainer(data.outputId);
                this.element.appendChild(outputContainer.element);
                this.outputElements.set(data.outputId, outputContainer);
            }
            return outputContainer.createOutputElement(data.outputId, data.outputOffset, data.left, data.cellId);
        }
        async renderOutputElement(data, preloadErrors, signal) {
            const startTime = Date.now();
            const outputElement /** outputNode */ = this.createOutputElement(data);
            await outputElement.render(data.content, data.rendererId, preloadErrors, signal);
            // don't hide until after this step so that the height is right
            outputElement /** outputNode */.element.style.visibility = data.initiallyHidden ? 'hidden' : '';
            if (!!data.executionId && !!data.rendererId) {
                let outputSize = undefined;
                if (data.content.type === 1 /* extension */) {
                    outputSize = data.content.output.valueBytes.length;
                }
                // Only send performance messages for non-empty outputs up to a certain size
                if (outputSize !== undefined && outputSize > 0 && outputSize < 100 * 1024) {
                    postNotebookMessage('notebookPerformanceMessage', {
                        cellId: data.cellId,
                        executionId: data.executionId,
                        duration: Date.now() - startTime,
                        rendererId: data.rendererId,
                        outputSize
                    });
                }
            }
        }
        clearOutput(outputId, rendererId) {
            const output = this.outputElements.get(outputId);
            output?.clear(rendererId);
            output?.dispose();
            this.outputElements.delete(outputId);
        }
        show(outputId, top) {
            const outputContainer = this.outputElements.get(outputId);
            if (!outputContainer) {
                return;
            }
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        updateContentAndRerender(outputId, content) {
            this.outputElements.get(outputId)?.updateContentAndRender(content);
        }
        updateOutputHeight(outputId, height) {
            this.outputElements.get(outputId)?.updateHeight(height);
        }
        updateScroll(request) {
            this.element.style.top = `${request.cellTop}px`;
            const outputElement = this.outputElements.get(request.outputId);
            if (outputElement) {
                outputElement.updateScroll(request.outputOffset);
                if (request.forceDisplay && outputElement.outputNode) {
                    // TODO @rebornix @mjbvz, there is a misalignment here.
                    // We set output visibility on cell container, other than output container or output node itself.
                    outputElement.outputNode.element.style.visibility = '';
                }
            }
            if (request.forceDisplay) {
                this.element.style.visibility = '';
            }
        }
    }
    class OutputContainer {
        get outputNode() {
            return this._outputNode;
        }
        constructor(outputId) {
            this.outputId = outputId;
            this.element = document.createElement('div');
            this.element.classList.add('output_container');
            this.element.setAttribute('data-vscode-context', JSON.stringify({ 'preventDefaultContextMenuItems': true }));
            this.element.style.position = 'absolute';
            this.element.style.overflow = 'hidden';
        }
        dispose() {
            this._outputNode?.dispose();
        }
        clear(rendererId) {
            if (rendererId) {
                renderers.clearOutput(rendererId, this.outputId);
            }
            this.element.remove();
        }
        updateHeight(height) {
            this.element.style.maxHeight = `${height}px`;
            this.element.style.height = `${height}px`;
        }
        updateScroll(outputOffset) {
            this.element.style.top = `${outputOffset}px`;
        }
        createOutputElement(outputId, outputOffset, left, cellId) {
            this.element.innerText = '';
            this.element.style.maxHeight = '0px';
            this.element.style.top = `${outputOffset}px`;
            this._outputNode?.dispose();
            this._outputNode = new OutputElement(outputId, left, cellId);
            this.element.appendChild(this._outputNode.element);
            return this._outputNode;
        }
        updateContentAndRender(content) {
            this._outputNode?.updateAndRerender(content);
        }
    }
    vscode.postMessage({
        __vscode_notebook_message: true,
        type: 'initialized'
    });
    for (const preload of ctx.staticPreloadsData) {
        kernelPreloads.load(preload.entrypoint);
    }
    function postNotebookMessage(type, properties) {
        vscode.postMessage({
            __vscode_notebook_message: true,
            type,
            ...properties
        });
    }
    class OutputElement {
        constructor(outputId, left, cellId) {
            this.outputId = outputId;
            this.cellId = cellId;
            this.hasResizeObserver = false;
            this.isImageOutput = false;
            this.element = document.createElement('div');
            this.element.id = outputId;
            this.element.classList.add('output');
            this.element.style.position = 'absolute';
            this.element.style.top = `0px`;
            this.element.style.left = left + 'px';
            this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseenter', { id: outputId });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseleave', { id: outputId });
            });
            // Add drag handler
            this.element.addEventListener('dragstart', (e) => {
                if (!e.dataTransfer) {
                    return;
                }
                const outputData = {
                    outputId: this.outputId,
                };
                e.dataTransfer.setData('notebook-cell-output', JSON.stringify(outputData));
            });
            // Add alt key handlers
            window.addEventListener('keydown', (e) => {
                if (e.altKey) {
                    this.element.draggable = true;
                }
            });
            window.addEventListener('keyup', (e) => {
                if (!e.altKey) {
                    this.element.draggable = this.isImageOutput;
                }
            });
            // Handle window blur to reset draggable state
            window.addEventListener('blur', () => {
                this.element.draggable = this.isImageOutput;
            });
        }
        dispose() {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        async render(content, preferredRendererId, preloadErrors, signal) {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
            this._content = { preferredRendererId, preloadErrors };
            if (content.type === 0 /* RenderOutputType.Html */) {
                const trustedHtml = ttPolicy?.createHTML(content.htmlContent) ?? content.htmlContent;
                this.element.innerHTML = trustedHtml; // CodeQL [SM03712] The content comes from renderer extensions, not from direct user input.
            }
            else if (preloadErrors.some(e => e instanceof Error)) {
                const errors = preloadErrors.filter((e) => e instanceof Error);
                showRenderError(`Error loading preloads`, this.element, errors);
            }
            else {
                const imageMimeTypes = ['image/png', 'image/jpeg', 'image/svg'];
                this.isImageOutput = imageMimeTypes.includes(content.output.mime);
                this.element.draggable = this.isImageOutput;
                const item = createOutputItem(this.outputId, content.output.mime, content.metadata, content.output.valueBytes, content.allOutputs, content.output.appended);
                const controller = new AbortController();
                this.renderTaskAbort = controller;
                // Abort rendering if caller aborts
                signal?.addEventListener('abort', () => controller.abort());
                try {
                    await renderers.render(item, preferredRendererId, this.element, controller.signal);
                }
                finally {
                    if (this.renderTaskAbort === controller) {
                        this.renderTaskAbort = undefined;
                    }
                }
            }
            if (!this.hasResizeObserver) {
                this.hasResizeObserver = true;
                resizeObserver.observe(this.element, this.outputId, true, this.cellId);
            }
            const offsetHeight = this.element.offsetHeight;
            const cps = document.defaultView.getComputedStyle(this.element);
            const verticalPadding = parseFloat(cps.paddingTop) + parseFloat(cps.paddingBottom);
            const contentHeight = offsetHeight - verticalPadding;
            if (elementHasContent(contentHeight) && cps.padding === '0px') {
                // we set padding to zero if the output has no content (then we can have a zero-height output DOM node)
                // thus we need to ensure the padding is accounted when updating the init height of the output
                dimensionUpdater.updateHeight(this.outputId, offsetHeight + ctx.style.outputNodePadding * 2, {
                    isOutput: true,
                    init: true
                });
                this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            }
            else if (elementHasContent(contentHeight)) {
                dimensionUpdater.updateHeight(this.outputId, this.element.offsetHeight, {
                    isOutput: true,
                    init: true
                });
                this.element.style.padding = `0 ${ctx.style.outputNodePadding}px 0 ${ctx.style.outputNodeLeftPadding}`;
            }
            else {
                // we have a zero-height output DOM node
                dimensionUpdater.updateHeight(this.outputId, 0, {
                    isOutput: true,
                    init: true,
                });
            }
            const root = this.element.shadowRoot ?? this.element;
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            if (codeBlocks.length > 0) {
                postNotebookMessage('renderedCellOutput', {
                    codeBlocks
                });
            }
        }
        updateAndRerender(content) {
            if (this._content) {
                this.render(content, this._content.preferredRendererId, this._content.preloadErrors);
            }
        }
    }
    const markupCellDragManager = new class MarkupCellDragManager {
        constructor() {
            window.document.addEventListener('dragover', e => {
                // Allow dropping dragged markup cells
                e.preventDefault();
            });
            window.document.addEventListener('drop', e => {
                e.preventDefault();
                const drag = this.currentDrag;
                if (!drag) {
                    return;
                }
                this.currentDrag = undefined;
                postNotebookMessage('cell-drop', {
                    cellId: drag.cellId,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    dragOffsetY: e.clientY,
                });
            });
        }
        startDrag(e, cellId) {
            if (!e.dataTransfer) {
                return;
            }
            if (!currentOptions.dragAndDropEnabled) {
                return;
            }
            this.currentDrag = { cellId, clientY: e.clientY };
            const overlayZIndex = 9999;
            if (!this.dragOverlay) {
                this.dragOverlay = document.createElement('div');
                this.dragOverlay.style.position = 'absolute';
                this.dragOverlay.style.top = '0';
                this.dragOverlay.style.left = '0';
                this.dragOverlay.style.zIndex = `${overlayZIndex}`;
                this.dragOverlay.style.width = '100%';
                this.dragOverlay.style.height = '100%';
                this.dragOverlay.style.background = 'transparent';
                window.document.body.appendChild(this.dragOverlay);
            }
            e.target.style.zIndex = `${overlayZIndex + 1}`;
            e.target.classList.add('dragging');
            postNotebookMessage('cell-drag-start', {
                cellId: cellId,
                dragOffsetY: e.clientY,
            });
            // Continuously send updates while dragging instead of relying on `updateDrag`.
            // This lets us scroll the list based on drag position.
            const trySendDragUpdate = () => {
                if (this.currentDrag?.cellId !== cellId) {
                    return;
                }
                postNotebookMessage('cell-drag', {
                    cellId: cellId,
                    dragOffsetY: this.currentDrag.clientY,
                });
                window.requestAnimationFrame(trySendDragUpdate);
            };
            window.requestAnimationFrame(trySendDragUpdate);
        }
        updateDrag(e, cellId) {
            if (cellId !== this.currentDrag?.cellId) {
                this.currentDrag = undefined;
            }
            else {
                this.currentDrag = { cellId, clientY: e.clientY };
            }
        }
        endDrag(e, cellId) {
            this.currentDrag = undefined;
            e.target.classList.remove('dragging');
            postNotebookMessage('cell-drag-end', {
                cellId: cellId
            });
            if (this.dragOverlay) {
                this.dragOverlay.remove();
                this.dragOverlay = undefined;
            }
            e.target.style.zIndex = '';
        }
    }();
}
export function preloadsScriptStr(styleValues, options, renderOptions, renderers, preloads, isWorkspaceTrusted, nonce) {
    const ctx = {
        style: styleValues,
        options,
        renderOptions,
        rendererData: renderers,
        staticPreloadsData: preloads,
        isWorkspaceTrusted,
        nonce,
    };
    // TS will try compiling `import()` in webviewPreloads, so use a helper function instead
    // of using `import(...)` directly
    return `
		const __import = (x) => import(x);
		(${webviewPreloads})(
			JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(ctx))}"))
		)\n//# sourceURL=notebookWebviewPreloads.js\n`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ByZWxvYWRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvcmVuZGVyZXJzL3dlYnZpZXdQcmVsb2Fkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXdGaEcsS0FBSyxVQUFVLGVBQWUsQ0FBQyxHQUFtQjtJQUVqRCxnRUFBZ0U7SUFFaEUsa0VBQWtFO0lBQ2xFLGlFQUFpRTtJQUNqRSxrREFBa0Q7SUFFbEQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztJQUN0QyxNQUFNLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBRXRDLFNBQVMsb0JBQW9CO1FBQzVCLElBQUksT0FBNEMsQ0FBQztRQUNqRCxJQUFJLE1BQThCLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDM0MsT0FBTyxHQUFHLEdBQUcsQ0FBQztZQUNkLE1BQU0sR0FBRyxHQUFHLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQVEsRUFBRSxNQUFNLEVBQUUsTUFBTyxFQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELElBQUksY0FBYyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFDakMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUM7SUFDbEQsSUFB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