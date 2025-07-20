/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mockService } from '../utils/mock.js';
import { PromptsConfig } from '../../../../common/promptSyntax/config/config.js';
import { PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
function createMock(value) {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            assert([PromptsConfig.KEY, PromptsConfig.PROMPT_LOCATIONS_KEY, PromptsConfig.INSTRUCTIONS_LOCATION_KEY, PromptsConfig.MODE_LOCATION_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
}
suite('PromptsConfig', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('enabled', () => {
        test('true', () => {
            const configService = createMock(true);
            assert.strictEqual(PromptsConfig.enabled(configService), true, 'Must read correct enablement value.');
        });
        test('false', () => {
            const configService = createMock(false);
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('null', () => {
            const configService = createMock(null);
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('string', () => {
            const configService = createMock('');
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('true string', () => {
            const configService = createMock('TRUE');
            assert.strictEqual(PromptsConfig.enabled(configService), true, 'Must read correct enablement value.');
        });
        test('false string', () => {
            const configService = createMock('FaLsE');
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('number', () => {
            const configService = createMock(randomInt(100));
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('NaN', () => {
            const configService = createMock(NaN);
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('bigint', () => {
            const configService = createMock(BigInt(randomInt(100)));
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('symbol', () => {
            const configService = createMock(Symbol('test'));
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('object', () => {
            const configService = createMock({
                '.github/prompts': false,
            });
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
        test('array', () => {
            const configService = createMock(['.github/prompts']);
            assert.strictEqual(PromptsConfig.enabled(configService), false, 'Must read correct enablement value.');
        });
    });
    suite('getLocationsValue', () => {
        test('undefined', () => {
            const configService = createMock(undefined);
            assert.strictEqual(PromptsConfig.getLocationsValue(configService, PromptsType.prompt), undefined, 'Must read correct value.');
        });
        test('null', () => {
            const configService = createMock(null);
            assert.strictEqual(PromptsConfig.getLocationsValue(configService, PromptsType.prompt), undefined, 'Must read correct value.');
        });
        suite('object', () => {
            test('empty', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({}), PromptsType.prompt), {}, 'Must read correct value.');
            });
            test('only valid strings', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    './.tempfile': true,
                }), PromptsType.prompt), {
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    './.tempfile': true,
                }, 'Must read correct value.');
            });
            test('filters out non valid entries', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                }), PromptsType.prompt), {
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '../../development/branch.name/some.test': true,
                    '/Home/user/.ssh/config': true,
                    '/tmp/.temp.folder/cache.db': true,
                    './scripts/.old.build.sh': true,
                }, 'Must read correct value.');
            });
            test('only invalid or false values', () => {
                assert.deepStrictEqual(PromptsConfig.getLocationsValue(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/IMG/logo.v2.png': '',
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    './hidden.dir/.subhidden': '\f',
                    '/opt/Software/v3.2.1/build.log': '  ',
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                }), PromptsType.prompt), {
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                }, 'Must read correct value.');
            });
        });
    });
    suite('sourceLocations', () => {
        test('undefined', () => {
            const configService = createMock(undefined);
            assert.deepStrictEqual(PromptsConfig.promptSourceFolders(configService, PromptsType.prompt), [], 'Must read correct value.');
        });
        test('null', () => {
            const configService = createMock(null);
            assert.deepStrictEqual(PromptsConfig.promptSourceFolders(configService, PromptsType.prompt), [], 'Must read correct value.');
        });
        suite('object', () => {
            test('empty', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({}), PromptsType.prompt), ['.github/prompts'], 'Must read correct value.');
            });
            test('only valid strings', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/root/.bashrc': true,
                    '../../folder/.hidden-folder/config.xml': true,
                    '/srv/www/Public_html/.htaccess': true,
                    '../../another.folder/.WEIRD_FILE.log': true,
                    './folder.name/file.name': true,
                    '/media/external/backup.tar.gz': true,
                    '/Media/external/.secret.backup': true,
                    '../relative/path.to.file': true,
                    './folderName.with.dots/more.dots.extension': true,
                    'some/folder.with.dots/another.file': true,
                    '/var/logs/app.01.05.error': true,
                    '.GitHub/prompts': true,
                    './.tempfile': true,
                }), PromptsType.prompt), [
                    '.github/prompts',
                    '/root/.bashrc',
                    '../../folder/.hidden-folder/config.xml',
                    '/srv/www/Public_html/.htaccess',
                    '../../another.folder/.WEIRD_FILE.log',
                    './folder.name/file.name',
                    '/media/external/backup.tar.gz',
                    '/Media/external/.secret.backup',
                    '../relative/path.to.file',
                    './folderName.with.dots/more.dots.extension',
                    'some/folder.with.dots/another.file',
                    '/var/logs/app.01.05.error',
                    '.GitHub/prompts',
                    './.tempfile',
                ], 'Must read correct value.');
            });
            test('filters out non valid entries', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '.giThub/prompts': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '.github/prompts': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                }), PromptsType.prompt), [
                    '.github/prompts',
                    '../assets/img/logo.v2.png',
                    '../.local/bin/script.sh',
                    '../../development/branch.name/some.test',
                    '.giThub/prompts',
                    '/Home/user/.ssh/config',
                    '/tmp/.temp.folder/cache.db',
                    './scripts/.old.build.sh',
                ], 'Must read correct value.');
            });
            test('only invalid or false values', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '../assets/IMG/logo.v2.png': '',
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    './hidden.dir/.subhidden': '\f',
                    '/opt/Software/v3.2.1/build.log': '  ',
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                }), PromptsType.prompt), [
                    '.github/prompts',
                ], 'Must read correct value.');
            });
            test('filters out disabled default location', () => {
                assert.deepStrictEqual(PromptsConfig.promptSourceFolders(createMock({
                    '/etc/hosts.backup': '\t\n\t',
                    './run.tests.sh': '\v',
                    '.github/prompts': false,
                    '../assets/img/logo.v2.png': true,
                    '/mnt/storage/video.archive/episode.01.mkv': false,
                    '../.local/bin/script.sh': true,
                    '/usr/local/share/.fonts/CustomFont.otf': '',
                    '../../development/branch.name/some.test': true,
                    '.giThub/prompts': true,
                    '/Home/user/.ssh/config': true,
                    './hidden.dir/.subhidden': '\f',
                    '/tmp/.temp.folder/cache.db': true,
                    '/opt/software/v3.2.1/build.log': '  ',
                    '': true,
                    './scripts/.old.build.sh': true,
                    '/var/data/datafile.2025-02-05.json': '\n',
                    '\n\n': true,
                    '\t': true,
                    '\v': true,
                    '\f': true,
                    '\r\n': true,
                    '\f\f': true,
                    '../lib/some_library.v1.0.1.so': '\r\n',
                    '/dev/shm/.shared_resource': randomInt(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
                }), PromptsType.prompt), [
                    '../assets/img/logo.v2.png',
                    '../.local/bin/script.sh',
                    '../../development/branch.name/some.test',
                    '.giThub/prompts',
                    '/Home/user/.ssh/config',
                    '/tmp/.temp.folder/cache.db',
                    './scripts/.old.build.sh',
                ], 'Must read correct value.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9jb25maWcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3pHOztHQUVHO0FBQ0gsU0FBUyxVQUFVLENBQUksS0FBUTtJQUM5QixPQUFPLFdBQVcsQ0FBd0I7UUFDekMsUUFBUSxDQUFDLEdBQXNDO1lBQzlDLE1BQU0sQ0FDTCxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQ3ZCLDJDQUEyQyxPQUFPLEdBQUcsSUFBSSxDQUN6RCxDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxDQUFDLHlCQUF5QixFQUFFLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFDL0ksa0NBQWtDLEdBQUcsSUFBSSxDQUN6QyxDQUFDO1lBRUYsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lB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