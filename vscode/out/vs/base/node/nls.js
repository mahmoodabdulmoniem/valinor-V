/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { join } from '../common/path.js';
import { promises } from 'fs';
import { mark } from '../common/performance.js';
import { Promises } from './pfs.js';
export async function resolveNLSConfiguration({ userLocale, osLocale, userDataPath, commit, nlsMetadataPath }) {
    mark('code/willGenerateNls');
    if (process.env['VSCODE_DEV'] ||
        userLocale === 'pseudo' ||
        userLocale.startsWith('en') ||
        !commit ||
        !userDataPath) {
        return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
    }
    try {
        const languagePacks = await getLanguagePackConfigurations(userDataPath);
        if (!languagePacks) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const resolvedLanguage = resolveLanguagePackLanguage(languagePacks, userLocale);
        if (!resolvedLanguage) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePack = languagePacks[resolvedLanguage];
        const mainLanguagePackPath = languagePack?.translations?.['vscode'];
        if (!languagePack ||
            typeof languagePack.hash !== 'string' ||
            !languagePack.translations ||
            typeof mainLanguagePackPath !== 'string' ||
            !(await Promises.exists(mainLanguagePackPath))) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePackId = `${languagePack.hash}.${resolvedLanguage}`;
        const globalLanguagePackCachePath = join(userDataPath, 'clp', languagePackId);
        const commitLanguagePackCachePath = join(globalLanguagePackCachePath, commit);
        const languagePackMessagesFile = join(commitLanguagePackCachePath, 'nls.messages.json');
        const translationsConfigFile = join(globalLanguagePackCachePath, 'tcf.json');
        const languagePackCorruptMarkerFile = join(globalLanguagePackCachePath, 'corrupted.info');
        if (await Promises.exists(languagePackCorruptMarkerFile)) {
            await promises.rm(globalLanguagePackCachePath, { recursive: true, force: true, maxRetries: 3 }); // delete corrupted cache folder
        }
        const result = {
            userLocale,
            osLocale,
            resolvedLanguage,
            defaultMessagesFile: join(nlsMetadataPath, 'nls.messages.json'),
            languagePack: {
                translationsConfigFile,
                messagesFile: languagePackMessagesFile,
                corruptMarkerFile: languagePackCorruptMarkerFile
            },
            // NLS: below properties are a relic from old times only used by vscode-nls and deprecated
            locale: userLocale,
            availableLanguages: { '*': resolvedLanguage },
            _languagePackId: languagePackId,
            _languagePackSupport: true,
            _translationsConfigFile: translationsConfigFile,
            _cacheRoot: globalLanguagePackCachePath,
            _resolvedLanguagePackCoreLocation: commitLanguagePackCachePath,
            _corruptedFile: languagePackCorruptMarkerFile
        };
        if (await Promises.exists(languagePackMessagesFile)) {
            touch(commitLanguagePackCachePath).catch(() => { }); // We don't wait for this. No big harm if we can't touch
            mark('code/didGenerateNls');
            return result;
        }
        const [nlsDefaultKeys, nlsDefaultMessages, nlsPackdata] 
        //      ^moduleId ^nlsKeys                               ^moduleId      ^nlsKey ^nlsValue
        = await Promise.all([
            promises.readFile(join(nlsMetadataPath, 'nls.keys.json'), 'utf-8').then(content => JSON.parse(content)),
            promises.readFile(join(nlsMetadataPath, 'nls.messages.json'), 'utf-8').then(content => JSON.parse(content)),
            promises.readFile(mainLanguagePackPath, 'utf-8').then(content => JSON.parse(content)),
        ]);
        const nlsResult = [];
        // We expect NLS messages to be in a flat array in sorted order as they
        // where produced during build time. We use `nls.keys.json` to know the
        // right order and then lookup the related message from the translation.
        // If a translation does not exist, we fallback to the default message.
        let nlsIndex = 0;
        for (const [moduleId, nlsKeys] of nlsDefaultKeys) {
            const moduleTranslations = nlsPackdata.contents[moduleId];
            for (const nlsKey of nlsKeys) {
                nlsResult.push(moduleTranslations?.[nlsKey] || nlsDefaultMessages[nlsIndex]);
                nlsIndex++;
            }
        }
        await promises.mkdir(commitLanguagePackCachePath, { recursive: true });
        await Promise.all([
            promises.writeFile(languagePackMessagesFile, JSON.stringify(nlsResult), 'utf-8'),
            promises.writeFile(translationsConfigFile, JSON.stringify(languagePack.translations), 'utf-8')
        ]);
        mark('code/didGenerateNls');
        return result;
    }
    catch (error) {
        console.error('Generating translation files failed.', error);
    }
    return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
}
/**
 * The `languagepacks.json` file is a JSON file that contains all metadata
 * about installed language extensions per language. Specifically, for
 * core (`vscode`) and all extensions it supports, it points to the related
 * translation files.
 *
 * The file is updated whenever a new language pack is installed or removed.
 */
async function getLanguagePackConfigurations(userDataPath) {
    const configFile = join(userDataPath, 'languagepacks.json');
    try {
        return JSON.parse(await promises.readFile(configFile, 'utf-8'));
    }
    catch (err) {
        return undefined; // Do nothing. If we can't read the file we have no language pack config.
    }
}
function resolveLanguagePackLanguage(languagePacks, locale) {
    try {
        while (locale) {
            if (languagePacks[locale]) {
                return locale;
            }
            const index = locale.lastIndexOf('-');
            if (index > 0) {
                locale = locale.substring(0, index);
            }
            else {
                return undefined;
            }
        }
    }
    catch (error) {
        console.error('Resolving language pack configuration failed.', error);
    }
    return undefined;
}
function defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath) {
    mark('code/didGenerateNls');
    return {
        userLocale,
        osLocale,
        resolvedLanguage: 'en',
        defaultMessagesFile: join(nlsMetadataPath, 'nls.messages.json'),
        // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
        locale: userLocale,
        availableLanguages: {}
    };
}
//#region fs helpers
function touch(path) {
    const date = new Date();
    return promises.utimes(path, date, date);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvbmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBZ0NwQyxNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUFDLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBbUM7SUFDN0ksSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFFN0IsSUFDQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztRQUN6QixVQUFVLEtBQUssUUFBUTtRQUN2QixVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztRQUMzQixDQUFDLE1BQU07UUFDUCxDQUFDLFlBQVksRUFDWixDQUFDO1FBQ0YsT0FBTyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixNQUFNLGFBQWEsR0FBRyxNQUFNLDZCQUE2QixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsMkJBQTJCLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FB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