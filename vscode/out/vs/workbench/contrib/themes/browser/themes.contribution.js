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
import { localize, localize2 } from '../../../../nls.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { MenuRegistry, MenuId, Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchThemeService, ThemeSettings } from '../../../services/themes/common/workbenchThemeService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IExtensionGalleryService, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions as ColorRegistryExtensions } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Color } from '../../../../base/common/color.js';
import { ColorScheme, isHighContrast } from '../../../../platform/theme/common/theme.js';
import { colorThemeSchemaId } from '../../../services/themes/common/colorThemeSchema.js';
import { isCancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { DEFAULT_PRODUCT_ICON_THEME_ID, ProductIconThemeData } from '../../../services/themes/browser/productIconThemeData.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Emitter } from '../../../../base/common/event.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { FileIconThemeData } from '../../../services/themes/browser/fileIconThemeData.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export const manageExtensionIcon = registerIcon('theme-selection-manage-extension', Codicon.gear, localize('manageExtensionIcon', 'Icon for the \'Manage\' action in the theme selection quick pick.'));
var ConfigureItem;
(function (ConfigureItem) {
    ConfigureItem["BROWSE_GALLERY"] = "marketplace";
    ConfigureItem["EXTENSIONS_VIEW"] = "extensions";
    ConfigureItem["CUSTOM_TOP_ENTRY"] = "customTopEntry";
})(ConfigureItem || (ConfigureItem = {}));
let MarketplaceThemesPicker = class MarketplaceThemesPicker {
    constructor(getMarketplaceColorThemes, marketplaceQuery, extensionGalleryService, extensionManagementService, quickInputService, logService, progressService, extensionsWorkbenchService, dialogService) {
        this.getMarketplaceColorThemes = getMarketplaceColorThemes;
        this.marketplaceQuery = marketplaceQuery;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManagementService = extensionManagementService;
        this.quickInputService = quickInputService;
        this.logService = logService;
        this.progressService = progressService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this._marketplaceExtensions = new Set();
        this._marketplaceThemes = [];
        this._searchOngoing = false;
        this._searchError = undefined;
        this._onDidChange = new Emitter();
        this._queryDelayer = new ThrottledDelayer(200);
        this._installedExtensions = extensionManagementService.getInstalled().then(installed => {
            const result = new Set();
            for (const ext of installed) {
                result.add(ext.identifier.id);
            }
            return result;
        });
    }
    get themes() {
        return this._marketplaceThemes;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    trigger(value) {
        if (this._tokenSource) {
            this._tokenSource.cancel();
            this._tokenSource = undefined;
        }
        this._queryDelayer.trigger(() => {
            this._tokenSource = new CancellationTokenSource();
            return this.doSearch(value, this._tokenSource.token);
        });
    }
    async doSearch(value, token) {
        this._searchOngoing = true;
        this._onDidChange.fire();
        try {
            const installedExtensions = await this._installedExtensions;
            const options = { text: `${this.marketplaceQuery} ${value}`, pageSize: 20 };
            const pager = await this.extensionGalleryService.query(options, token);
            for (let i = 0; i < pager.total && i < 1; i++) { // loading multiple pages is turned of for now to avoid flickering
                if (token.isCancellationRequested) {
                    break;
                }
                const nThemes = this._marketplaceThemes.length;
                const gallery = i === 0 ? pager.firstPage : await pager.getPage(i, token);
                const promises = [];
                const promisesGalleries = [];
                for (let i = 0; i < gallery.length; i++) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    const ext = gallery[i];
                    if (!installedExtensions.has(ext.identifier.id) && !this._marketplaceExtensions.has(ext.identifier.id)) {
                        this._marketplaceExtensions.add(ext.identifier.id);
                        promises.push(this.getMarketplaceColorThemes(ext.publisher, ext.name, ext.version));
                        promisesGalleries.push(ext);
                    }
                }
                const allThemes = await Promise.all(promises);
                for (let i = 0; i < allThemes.length; i++) {
                    const ext = promisesGalleries[i];
                    for (const theme of allThemes[i]) {
                        this._marketplaceThemes.push({ id: theme.id, theme: theme, label: theme.label, description: `${ext.displayName} · ${ext.publisherDisplayName}`, galleryExtension: ext, buttons: [configureButton] });
                    }
                }
                if (nThemes !== this._marketplaceThemes.length) {
                    this._marketplaceThemes.sort((t1, t2) => t1.label.localeCompare(t2.label));
                    this._onDidChange.fire();
                }
            }
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.logService.error(`Error while searching for themes:`, e);
                this._searchError = 'message' in e ? e.message : String(e);
            }
        }
        finally {
            this._searchOngoing = false;
            this._onDidChange.fire();
        }
    }
    openQuickPick(value, currentTheme, selectTheme) {
        let result = undefined;
        const disposables = new DisposableStore();
        return new Promise((s, _) => {
            const quickpick = disposables.add(this.quickInputService.createQuickPick());
            quickpick.items = [];
            quickpick.sortByLabel = false;
            quickpick.matchOnDescription = true;
            quickpick.buttons = [this.quickInputService.backButton];
            quickpick.title = 'Marketplace Themes';
            quickpick.placeholder = localize('themes.selectMarketplaceTheme', "Type to Search More. Select to Install. Up/Down Keys to Preview");
            quickpick.canSelectMany = false;
            disposables.add(quickpick.onDidChangeValue(() => this.trigger(quickpick.value)));
            disposables.add(quickpick.onDidAccept(async (_) => {
                const themeItem = quickpick.selectedItems[0];
                if (themeItem?.galleryExtension) {
                    result = 'selected';
                    quickpick.hide();
                    const success = await this.installExtension(themeItem.galleryExtension);
                    if (success) {
                        selectTheme(themeItem.theme, true);
                    }
                    else {
                        selectTheme(currentTheme, true);
                    }
                }
            }));
            disposables.add(quickpick.onDidTriggerItemButton(e => {
                if (isItem(e.item)) {
                    const extensionId = e.item.theme?.extensionData?.extensionId;
                    if (extensionId) {
                        this.extensionsWorkbenchService.openSearch(`@id:${extensionId}`);
                    }
                    else {
                        this.extensionsWorkbenchService.openSearch(`${this.marketplaceQuery} ${quickpick.value}`);
                    }
                }
            }));
            disposables.add(quickpick.onDidChangeActive(themes => {
                if (result === undefined) {
                    selectTheme(themes[0]?.theme, false);
                }
            }));
            disposables.add(quickpick.onDidHide(() => {
                if (result === undefined) {
                    selectTheme(currentTheme, true);
                    result = 'cancelled';
                }
                s(result);
            }));
            disposables.add(quickpick.onDidTriggerButton(e => {
                if (e === this.quickInputService.backButton) {
                    result = 'back';
                    quickpick.hide();
                }
            }));
            disposables.add(this.onDidChange(() => {
                let items = this.themes;
                if (this._searchOngoing) {
                    items = items.concat({ label: '$(loading~spin) Searching for themes...', id: undefined, alwaysShow: true });
                }
                else if (items.length === 0 && this._searchError) {
                    items = [{ label: `$(error) ${localize('search.error', 'Error while searching for themes: {0}', this._searchError)}`, id: undefined, alwaysShow: true }];
                }
                const activeItemId = quickpick.activeItems[0]?.id;
                const newActiveItem = activeItemId ? items.find(i => isItem(i) && i.id === activeItemId) : undefined;
                quickpick.items = items;
                if (newActiveItem) {
                    quickpick.activeItems = [newActiveItem];
                }
            }));
            this.trigger(value);
            quickpick.show();
        }).finally(() => {
            disposables.dispose();
        });
    }
    async installExtension(galleryExtension) {
        this.extensionsWorkbenchService.openSearch(`@id:${galleryExtension.identifier.id}`);
        const result = await this.dialogService.confirm({
            message: localize('installExtension.confirm', "This will install extension '{0}' published by '{1}'. Do you want to continue?", galleryExtension.displayName, galleryExtension.publisherDisplayName),
            primaryButton: localize('installExtension.button.ok', "OK")
        });
        if (!result.confirmed) {
            return false;
        }
        try {
            await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize('installing extensions', "Installing Extension {0}...", galleryExtension.displayName)
            }, async () => {
                await this.extensionManagementService.installFromGallery(galleryExtension, {
                    // Setting this to false is how you get the extension to be synced with Settings Sync (if enabled).
                    isMachineScoped: false,
                });
            });
            return true;
        }
        catch (e) {
            this.logService.error(`Problem installing extension ${galleryExtension.identifier.id}`, e);
            return false;
        }
    }
    dispose() {
        if (this._tokenSource) {
            this._tokenSource.cancel();
            this._tokenSource = undefined;
        }
        this._queryDelayer.dispose();
        this._marketplaceExtensions.clear();
        this._marketplaceThemes.length = 0;
        this._onDidChange.dispose();
    }
};
MarketplaceThemesPicker = __decorate([
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionManagementService),
    __param(4, IQuickInputService),
    __param(5, ILogService),
    __param(6, IProgressService),
    __param(7, IExtensionsWorkbenchService),
    __param(8, IDialogService)
], MarketplaceThemesPicker);
let InstalledThemesPicker = class InstalledThemesPicker {
    constructor(options, setTheme, getMarketplaceColorThemes, quickInputService, extensionGalleryService, extensionsWorkbenchService, extensionResourceLoaderService, instantiationService) {
        this.options = options;
        this.setTheme = setTheme;
        this.getMarketplaceColorThemes = getMarketplaceColorThemes;
        this.quickInputService = quickInputService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.instantiationService = instantiationService;
    }
    async openQuickPick(picks, currentTheme) {
        let marketplaceThemePicker;
        if (this.extensionGalleryService.isEnabled()) {
            if (await this.extensionResourceLoaderService.supportsExtensionGalleryResources() && this.options.browseMessage) {
                marketplaceThemePicker = this.instantiationService.createInstance(MarketplaceThemesPicker, this.getMarketplaceColorThemes.bind(this), this.options.marketplaceTag);
                picks = [configurationEntry(this.options.browseMessage, ConfigureItem.BROWSE_GALLERY), ...picks];
            }
            else {
                picks = [...picks, { type: 'separator' }, configurationEntry(this.options.installMessage, ConfigureItem.EXTENSIONS_VIEW)];
            }
        }
        let selectThemeTimeout;
        const selectTheme = (theme, applyTheme) => {
            if (selectThemeTimeout) {
                clearTimeout(selectThemeTimeout);
            }
            selectThemeTimeout = mainWindow.setTimeout(() => {
                selectThemeTimeout = undefined;
                const newTheme = (theme ?? currentTheme);
                this.setTheme(newTheme, applyTheme ? 'auto' : 'preview').then(undefined, err => {
                    onUnexpectedError(err);
                    this.setTheme(currentTheme, undefined);
                });
            }, applyTheme ? 0 : 200);
        };
        const pickInstalledThemes = (activeItemId) => {
            const disposables = new DisposableStore();
            return new Promise((s, _) => {
                let isCompleted = false;
                const autoFocusIndex = picks.findIndex(p => isItem(p) && p.id === activeItemId);
                const quickpick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
                quickpick.items = picks;
                quickpick.title = this.options.title;
                quickpick.description = this.options.description;
                quickpick.placeholder = this.options.placeholderMessage;
                quickpick.activeItems = [picks[autoFocusIndex]];
                quickpick.canSelectMany = false;
                quickpick.toggles = this.options.toggles;
                quickpick.toggles?.forEach(toggle => {
                    disposables.add(toggle.onChange(() => this.options.onToggle?.(toggle, quickpick)));
                });
                quickpick.matchOnDescription = true;
                disposables.add(quickpick.onDidAccept(async (_) => {
                    isCompleted = true;
                    const theme = quickpick.selectedItems[0];
                    if (!theme || theme.configureItem) { // 'pick in marketplace' entry
                        if (!theme || theme.configureItem === ConfigureItem.EXTENSIONS_VIEW) {
                            this.extensionsWorkbenchService.openSearch(`${this.options.marketplaceTag} ${quickpick.value}`);
                        }
                        else if (theme.configureItem === ConfigureItem.BROWSE_GALLERY) {
                            if (marketplaceThemePicker) {
                                const res = await marketplaceThemePicker.openQuickPick(quickpick.value, currentTheme, selectTheme);
                                if (res === 'back') {
                                    await pickInstalledThemes(undefined);
                                }
                            }
                        }
                    }
                    else {
                        selectTheme(theme.theme, true);
                    }
                    quickpick.hide();
                    s();
                }));
                disposables.add(quickpick.onDidChangeActive(themes => selectTheme(themes[0]?.theme, false)));
                disposables.add(quickpick.onDidHide(() => {
                    if (!isCompleted) {
                        selectTheme(currentTheme, true);
                        s();
                    }
                    quickpick.dispose();
                }));
                disposables.add(quickpick.onDidTriggerItemButton(e => {
                    if (isItem(e.item)) {
                        const extensionId = e.item.theme?.extensionData?.extensionId;
                        if (extensionId) {
                            this.extensionsWorkbenchService.openSearch(`@id:${extensionId}`);
                        }
                        else {
                            this.extensionsWorkbenchService.openSearch(`${this.options.marketplaceTag} ${quickpick.value}`);
                        }
                    }
                }));
                quickpick.show();
            }).finally(() => {
                disposables.dispose();
            });
        };
        await pickInstalledThemes(currentTheme.id);
        marketplaceThemePicker?.dispose();
    }
};
InstalledThemesPicker = __decorate([
    __param(3, IQuickInputService),
    __param(4, IExtensionGalleryService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IInstantiationService)
], InstalledThemesPicker);
const SelectColorThemeCommandId = 'workbench.action.selectTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectColorThemeCommandId,
            title: localize2('selectTheme.label', 'Color Theme'),
            category: Categories.Preferences,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 50 /* KeyCode.KeyT */)
            }
        });
    }
    getTitle(colorScheme) {
        switch (colorScheme) {
            case ColorScheme.DARK: return localize('themes.selectTheme.darkScheme', "Select Color Theme for System Dark Mode");
            case ColorScheme.LIGHT: return localize('themes.selectTheme.lightScheme', "Select Color Theme for System Light Mode");
            case ColorScheme.HIGH_CONTRAST_DARK: return localize('themes.selectTheme.darkHC', "Select Color Theme for High Contrast Dark Mode");
            case ColorScheme.HIGH_CONTRAST_LIGHT: return localize('themes.selectTheme.lightHC', "Select Color Theme for High Contrast Light Mode");
            default:
                return localize('themes.selectTheme.default', "Select Color Theme (detect system color mode disabled)");
        }
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const preferencesService = accessor.get(IPreferencesService);
        const preferredColorScheme = themeService.getPreferredColorScheme();
        let modeConfigureToggle;
        if (preferredColorScheme) {
            modeConfigureToggle = new Toggle({
                title: localize('themes.configure.switchingEnabled', 'Detect system color mode enabled. Click to configure.'),
                icon: Codicon.colorMode,
                isChecked: false,
                ...defaultToggleStyles
            });
        }
        else {
            modeConfigureToggle = new Toggle({
                title: localize('themes.configure.switchingDisabled', 'Detect system color mode disabled. Click to configure.'),
                icon: Codicon.colorMode,
                isChecked: false,
                ...defaultToggleStyles
            });
        }
        const options = {
            installMessage: localize('installColorThemes', "Install Additional Color Themes..."),
            browseMessage: '$(plus) ' + localize('browseColorThemes', "Browse Additional Color Themes..."),
            placeholderMessage: this.getTitle(preferredColorScheme),
            marketplaceTag: 'category:themes',
            toggles: [modeConfigureToggle],
            onToggle: async (toggle, picker) => {
                picker.hide();
                await preferencesService.openSettings({ query: ThemeSettings.DETECT_COLOR_SCHEME });
            }
        };
        const setTheme = (theme, settingsTarget) => themeService.setColorTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceColorThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const themes = await themeService.getColorThemes();
        const currentTheme = themeService.getColorTheme();
        const lightEntries = toEntries(themes.filter(t => t.type === ColorScheme.LIGHT), localize('themes.category.light', "light themes"));
        const darkEntries = toEntries(themes.filter(t => t.type === ColorScheme.DARK), localize('themes.category.dark', "dark themes"));
        const hcEntries = toEntries(themes.filter(t => isHighContrast(t.type)), localize('themes.category.hc', "high contrast themes"));
        let picks;
        switch (preferredColorScheme) {
            case ColorScheme.DARK:
                picks = [...darkEntries, ...lightEntries, ...hcEntries];
                break;
            case ColorScheme.HIGH_CONTRAST_DARK:
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                picks = [...hcEntries, ...lightEntries, ...darkEntries];
                break;
            case ColorScheme.LIGHT:
            default:
                picks = [...lightEntries, ...darkEntries, ...hcEntries];
                break;
        }
        await picker.openQuickPick(picks, currentTheme);
    }
});
const SelectFileIconThemeCommandId = 'workbench.action.selectIconTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectFileIconThemeCommandId,
            title: localize2('selectIconTheme.label', 'File Icon Theme'),
            category: Categories.Preferences,
            f1: true
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const options = {
            installMessage: localize('installIconThemes', "Install Additional File Icon Themes..."),
            placeholderMessage: localize('themes.selectIconTheme', "Select File Icon Theme (Up/Down Keys to Preview)"),
            marketplaceTag: 'tag:icon-theme'
        };
        const setTheme = (theme, settingsTarget) => themeService.setFileIconTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceFileIconThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const picks = [
            { type: 'separator', label: localize('fileIconThemeCategory', 'file icon themes') },
            { id: '', theme: FileIconThemeData.noIconTheme, label: localize('noIconThemeLabel', 'None'), description: localize('noIconThemeDesc', 'Disable File Icons') },
            ...toEntries(await themeService.getFileIconThemes()),
        ];
        await picker.openQuickPick(picks, themeService.getFileIconTheme());
    }
});
const SelectProductIconThemeCommandId = 'workbench.action.selectProductIconTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectProductIconThemeCommandId,
            title: localize2('selectProductIconTheme.label', 'Product Icon Theme'),
            category: Categories.Preferences,
            f1: true
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const options = {
            installMessage: localize('installProductIconThemes', "Install Additional Product Icon Themes..."),
            browseMessage: '$(plus) ' + localize('browseProductIconThemes', "Browse Additional Product Icon Themes..."),
            placeholderMessage: localize('themes.selectProductIconTheme', "Select Product Icon Theme (Up/Down Keys to Preview)"),
            marketplaceTag: 'tag:product-icon-theme'
        };
        const setTheme = (theme, settingsTarget) => themeService.setProductIconTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceProductIconThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const picks = [
            { type: 'separator', label: localize('productIconThemeCategory', 'product icon themes') },
            { id: DEFAULT_PRODUCT_ICON_THEME_ID, theme: ProductIconThemeData.defaultTheme, label: localize('defaultProductIconThemeLabel', 'Default') },
            ...toEntries(await themeService.getProductIconThemes()),
        ];
        await picker.openQuickPick(picks, themeService.getProductIconTheme());
    }
});
CommandsRegistry.registerCommand('workbench.action.previewColorTheme', async function (accessor, extension, themeSettingsId) {
    const themeService = accessor.get(IWorkbenchThemeService);
    let themes = findBuiltInThemes(await themeService.getColorThemes(), extension);
    if (themes.length === 0) {
        themes = await themeService.getMarketplaceColorThemes(extension.publisher, extension.name, extension.version);
    }
    for (const theme of themes) {
        if (!themeSettingsId || theme.settingsId === themeSettingsId) {
            await themeService.setColorTheme(theme, 'preview');
            return theme.settingsId;
        }
    }
    return undefined;
});
function findBuiltInThemes(themes, extension) {
    return themes.filter(({ extensionData }) => extensionData && extensionData.extensionIsBuiltin && equalsIgnoreCase(extensionData.extensionPublisher, extension.publisher) && equalsIgnoreCase(extensionData.extensionName, extension.name));
}
function configurationEntry(label, configureItem) {
    return {
        id: undefined,
        label: label,
        alwaysShow: true,
        buttons: [configureButton],
        configureItem: configureItem
    };
}
function isItem(i) {
    return i['type'] !== 'separator';
}
function toEntry(theme) {
    const settingId = theme.settingsId ?? undefined;
    const item = {
        id: theme.id,
        theme: theme,
        label: theme.label,
        description: theme.description || (theme.label === settingId ? undefined : settingId),
    };
    if (theme.extensionData) {
        item.buttons = [configureButton];
    }
    return item;
}
function toEntries(themes, label) {
    const sorter = (t1, t2) => t1.label.localeCompare(t2.label);
    const entries = themes.map(toEntry).sort(sorter);
    if (entries.length > 0 && label) {
        entries.unshift({ type: 'separator', label });
    }
    return entries;
}
const configureButton = {
    iconClass: ThemeIcon.asClassName(manageExtensionIcon),
    tooltip: localize('manage extension', "Manage Extension"),
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.generateColorTheme',
            title: localize2('generateColorTheme.label', 'Generate Color Theme From Current Settings'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const theme = themeService.getColorTheme();
        const colors = Registry.as(ColorRegistryExtensions.ColorContribution).getColors();
        const colorIds = colors.filter(c => !c.deprecationMessage).map(c => c.id).sort();
        const resultingColors = {};
        const inherited = [];
        for (const colorId of colorIds) {
            const color = theme.getColor(colorId, false);
            if (color) {
                resultingColors[colorId] = Color.Format.CSS.formatHexA(color, true);
            }
            else {
                inherited.push(colorId);
            }
        }
        const nullDefaults = [];
        for (const id of inherited) {
            const color = theme.getColor(id);
            if (color) {
                resultingColors['__' + id] = Color.Format.CSS.formatHexA(color, true);
            }
            else {
                nullDefaults.push(id);
            }
        }
        for (const id of nullDefaults) {
            resultingColors['__' + id] = null;
        }
        let contents = JSON.stringify({
            '$schema': colorThemeSchemaId,
            type: theme.type,
            colors: resultingColors,
            tokenColors: theme.tokenColors.filter(t => !!t.scope)
        }, null, '\t');
        contents = contents.replace(/\"__/g, '//"');
        const editorService = accessor.get(IEditorService);
        return editorService.openEditor({ resource: undefined, contents, languageId: 'jsonc', options: { pinned: true } });
    }
});
const toggleLightDarkThemesCommandId = 'workbench.action.toggleLightDarkThemes';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: toggleLightDarkThemesCommandId,
            title: localize2('toggleLightDarkThemes.label', 'Toggle between Light/Dark Themes'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const configurationService = accessor.get(IConfigurationService);
        const notificationService = accessor.get(INotificationService);
        const preferencesService = accessor.get(IPreferencesService);
        if (configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            const message = localize({ key: 'cannotToggle', comment: ['{0} is a setting name'] }, "Cannot toggle between light and dark themes when `{0}` is enabled in settings.", ThemeSettings.DETECT_COLOR_SCHEME);
            notificationService.prompt(Severity.Info, message, [
                {
                    label: localize('goToSetting', "Open Settings"),
                    run: () => {
                        return preferencesService.openUserSettings({ query: ThemeSettings.DETECT_COLOR_SCHEME });
                    }
                }
            ]);
            return;
        }
        const currentTheme = themeService.getColorTheme();
        let newSettingsId = ThemeSettings.PREFERRED_DARK_THEME;
        switch (currentTheme.type) {
            case ColorScheme.LIGHT:
                newSettingsId = ThemeSettings.PREFERRED_DARK_THEME;
                break;
            case ColorScheme.DARK:
                newSettingsId = ThemeSettings.PREFERRED_LIGHT_THEME;
                break;
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                newSettingsId = ThemeSettings.PREFERRED_HC_DARK_THEME;
                break;
            case ColorScheme.HIGH_CONTRAST_DARK:
                newSettingsId = ThemeSettings.PREFERRED_HC_LIGHT_THEME;
                break;
        }
        const themeSettingId = configurationService.getValue(newSettingsId);
        if (themeSettingId && typeof themeSettingId === 'string') {
            const theme = (await themeService.getColorThemes()).find(t => t.settingsId === themeSettingId);
            if (theme) {
                themeService.setColorTheme(theme.id, 'auto');
            }
        }
    }
});
const browseColorThemesInMarketplaceCommandId = 'workbench.action.browseColorThemesInMarketplace';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: browseColorThemesInMarketplaceCommandId,
            title: localize2('browseColorThemeInMarketPlace.label', 'Browse Color Themes in Marketplace'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const marketplaceTag = 'category:themes';
        const themeService = accessor.get(IWorkbenchThemeService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const extensionResourceLoaderService = accessor.get(IExtensionResourceLoaderService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const instantiationService = accessor.get(IInstantiationService);
        if (!extensionGalleryService.isEnabled()) {
            return;
        }
        if (!await extensionResourceLoaderService.supportsExtensionGalleryResources()) {
            await extensionsWorkbenchService.openSearch(marketplaceTag);
            return;
        }
        const currentTheme = themeService.getColorTheme();
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceColorThemes(publisher, name, version);
        let selectThemeTimeout;
        const selectTheme = (theme, applyTheme) => {
            if (selectThemeTimeout) {
                clearTimeout(selectThemeTimeout);
            }
            selectThemeTimeout = mainWindow.setTimeout(() => {
                selectThemeTimeout = undefined;
                const newTheme = (theme ?? currentTheme);
                themeService.setColorTheme(newTheme, applyTheme ? 'auto' : 'preview').then(undefined, err => {
                    onUnexpectedError(err);
                    themeService.setColorTheme(currentTheme, undefined);
                });
            }, applyTheme ? 0 : 200);
        };
        const marketplaceThemePicker = instantiationService.createInstance(MarketplaceThemesPicker, getMarketplaceColorThemes, marketplaceTag);
        await marketplaceThemePicker.openQuickPick('', themeService.getColorTheme(), selectTheme).then(undefined, onUnexpectedError);
    }
});
const ThemesSubMenu = new MenuId('ThemesSubMenu');
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    title: localize('themes', "Themes"),
    submenu: ThemesSubMenu,
    group: '2_configuration',
    order: 7
});
MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
    title: localize({ key: 'miSelectTheme', comment: ['&& denotes a mnemonic'] }, "&&Themes"),
    submenu: ThemesSubMenu,
    group: '2_configuration',
    order: 7
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectColorThemeCommandId,
        title: localize('selectTheme.label', 'Color Theme')
    },
    order: 1
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectFileIconThemeCommandId,
        title: localize('themes.selectIconTheme.label', "File Icon Theme")
    },
    order: 2
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectProductIconThemeCommandId,
        title: localize('themes.selectProductIconTheme.label', "Product Icon Theme")
    },
    order: 3
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGhlbWVzL2Jyb3dzZXIvdGhlbWVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBVSxRQUFRLEVBQVcsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLHNCQUFzQixFQUFrSCxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNqTyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQXFCLE1BQU0sd0VBQXdFLENBQUM7QUFDbEssT0FBTyxFQUFrQixVQUFVLElBQUksdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFD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