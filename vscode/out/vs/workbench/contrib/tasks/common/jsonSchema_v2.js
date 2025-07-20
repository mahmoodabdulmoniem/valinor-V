/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import commonSchema from './jsonSchemaCommon.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { getAllCodicons } from '../../../../base/common/codicons.js';
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '2';
        }
        Object.getOwnPropertyNames(literal).forEach(property => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
const shellCommand = {
    anyOf: [
        {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.shell', 'Specifies whether the command is a shell command or an external program. Defaults to false if omitted.')
        },
        {
            $ref: '#/definitions/shellConfiguration'
        }
    ],
    deprecationMessage: nls.localize('JsonSchema.tasks.isShellCommand.deprecated', 'The property isShellCommand is deprecated. Use the type property of the task and the shell property in the options instead. See also the 1.14 release notes.')
};
const hide = {
    type: 'boolean',
    description: nls.localize('JsonSchema.hide', 'Hide this task from the run task quick pick'),
    default: true
};
const taskIdentifier = {
    type: 'object',
    additionalProperties: true,
    properties: {
        type: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.identifier', 'The task identifier.')
        }
    }
};
const dependsOn = {
    anyOf: [
        {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.string', 'Another task this task depends on.')
        },
        taskIdentifier,
        {
            type: 'array',
            description: nls.localize('JsonSchema.tasks.dependsOn.array', 'The other tasks this task depends on.'),
            items: {
                anyOf: [
                    {
                        type: 'string',
                    },
                    taskIdentifier
                ]
            }
        }
    ],
    description: nls.localize('JsonSchema.tasks.dependsOn', 'Either a string representing another task or an array of other tasks that this task depends on.')
};
const dependsOrder = {
    type: 'string',
    enum: ['parallel', 'sequence'],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.dependsOrder.parallel', 'Run all dependsOn tasks in parallel.'),
        nls.localize('JsonSchema.tasks.dependsOrder.sequence', 'Run all dependsOn tasks in sequence.'),
    ],
    default: 'parallel',
    description: nls.localize('JsonSchema.tasks.dependsOrder', 'Determines the order of the dependsOn tasks for this task. Note that this property is not recursive.')
};
const detail = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.detail', 'An optional description of a task that shows in the Run Task quick pick as a detail.')
};
const icon = {
    type: 'object',
    description: nls.localize('JsonSchema.tasks.icon', 'An optional icon for the task'),
    properties: {
        id: {
            description: nls.localize('JsonSchema.tasks.icon.id', 'An optional codicon ID to use'),
            type: ['string', 'null'],
            enum: Array.from(getAllCodicons(), icon => icon.id),
            markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
        },
        color: {
            description: nls.localize('JsonSchema.tasks.icon.color', 'An optional color of the icon'),
            type: ['string', 'null'],
            enum: [
                'terminal.ansiBlack',
                'terminal.ansiRed',
                'terminal.ansiGreen',
                'terminal.ansiYellow',
                'terminal.ansiBlue',
                'terminal.ansiMagenta',
                'terminal.ansiCyan',
                'terminal.ansiWhite'
            ],
        },
    }
};
const presentation = {
    type: 'object',
    default: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared',
        showReuseMessage: true,
        clear: false,
    },
    description: nls.localize('JsonSchema.tasks.presentation', 'Configures the panel that is used to present the task\'s output and reads its input.'),
    additionalProperties: false,
    properties: {
        echo: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.echo', 'Controls whether the executed command is echoed to the panel. Default is true.')
        },
        focus: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.focus', 'Controls whether the panel takes focus. Default is false. If set to true the panel is revealed as well.')
        },
        revealProblems: {
            type: 'string',
            enum: ['always', 'onProblem', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.revealProblems.always', 'Always reveals the problems panel when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.onProblem', 'Only reveals the problems panel if a problem is found.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.never', 'Never reveals the problems panel when this task is executed.'),
            ],
            default: 'never',
            description: nls.localize('JsonSchema.tasks.presentation.revealProblems', 'Controls whether the problems panel is revealed when running this task or not. Takes precedence over option \"reveal\". Default is \"never\".')
        },
        reveal: {
            type: 'string',
            enum: ['always', 'silent', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.reveal.always', 'Always reveals the terminal when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.silent', 'Only reveals the terminal if the task exits with an error or the problem matcher finds an error.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.never', 'Never reveals the terminal when this task is executed.'),
            ],
            default: 'always',
            description: nls.localize('JsonSchema.tasks.presentation.reveal', 'Controls whether the terminal running the task is revealed or not. May be overridden by option \"revealProblems\". Default is \"always\".')
        },
        panel: {
            type: 'string',
            enum: ['shared', 'dedicated', 'new'],
            default: 'shared',
            description: nls.localize('JsonSchema.tasks.presentation.instance', 'Controls if the panel is shared between tasks, dedicated to this task or a new one is created on every run.')
        },
        showReuseMessage: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.showReuseMessage', 'Controls whether to show the `Terminal will be reused by tasks, press any key to close it` message.')
        },
        clear: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.clear', 'Controls whether the terminal is cleared before executing the task.')
        },
        group: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.presentation.group', 'Controls whether the task is executed in a specific terminal group using split panes.')
        },
        close: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.presentation.close', 'Controls whether the terminal the task runs in is closed when the task exits.')
        }
    }
};
const terminal = Objects.deepClone(presentation);
terminal.deprecationMessage = nls.localize('JsonSchema.tasks.terminal', 'The terminal property is deprecated. Use presentation instead');
const groupStrings = {
    type: 'string',
    enum: [
        'build',
        'test',
        'none'
    ],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.group.build', 'Marks the task as a build task accessible through the \'Run Build Task\' command.'),
        nls.localize('JsonSchema.tasks.group.test', 'Marks the task as a test task accessible through the \'Run Test Task\' command.'),
        nls.localize('JsonSchema.tasks.group.none', 'Assigns the task to no group')
    ],
    description: nls.localize('JsonSchema.tasks.group.kind', 'The task\'s execution group.')
};
const group = {
    oneOf: [
        groupStrings,
        {
            type: 'object',
            properties: {
                kind: groupStrings,
                isDefault: {
                    type: ['boolean', 'string'],
                    default: false,
                    description: nls.localize('JsonSchema.tasks.group.isDefault', 'Defines if this task is the default task in the group, or a glob to match the file which should trigger this task.')
                }
            }
        },
    ],
    defaultSnippets: [
        {
            body: { kind: 'build', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultBuild', 'Marks the task as the default build task.')
        },
        {
            body: { kind: 'test', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultTest', 'Marks the task as the default test task.')
        }
    ],
    description: nls.localize('JsonSchema.tasks.group', 'Defines to which execution group this task belongs to. It supports "build" to add it to the build group and "test" to add it to the test group.')
};
const taskType = {
    type: 'string',
    enum: ['shell'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.')
};
const command = {
    oneOf: [
        {
            oneOf: [
                {
                    type: 'string'
                },
                {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character')
                }
            ]
        },
        {
            type: 'object',
            required: ['value', 'quoting'],
            properties: {
                value: {
                    oneOf: [
                        {
                            type: 'string'
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character')
                        }
                    ],
                    description: nls.localize('JsonSchema.command.quotedString.value', 'The actual command value')
                },
                quoting: {
                    type: 'string',
                    enum: ['escape', 'strong', 'weak'],
                    enumDescriptions: [
                        nls.localize('JsonSchema.tasks.quoting.escape', 'Escapes characters using the shell\'s escape character (e.g. ` under PowerShell and \\ under bash).'),
                        nls.localize('JsonSchema.tasks.quoting.strong', 'Quotes the argument using the shell\'s strong quote character (e.g. \' under PowerShell and bash).'),
                        nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                    ],
                    default: 'strong',
                    description: nls.localize('JsonSchema.command.quotesString.quote', 'How the command value should be quoted.')
                }
            }
        }
    ],
    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.')
};
const args = {
    type: 'array',
    items: {
        oneOf: [
            {
                type: 'string',
            },
            {
                type: 'object',
                required: ['value', 'quoting'],
                properties: {
                    value: {
                        type: 'string',
                        description: nls.localize('JsonSchema.args.quotedString.value', 'The actual argument value')
                    },
                    quoting: {
                        type: 'string',
                        enum: ['escape', 'strong', 'weak'],
                        enumDescriptions: [
                            nls.localize('JsonSchema.tasks.quoting.escape', 'Escapes characters using the shell\'s escape character (e.g. ` under PowerShell and \\ under bash).'),
                            nls.localize('JsonSchema.tasks.quoting.strong', 'Quotes the argument using the shell\'s strong quote character (e.g. \' under PowerShell and bash).'),
                            nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                        ],
                        default: 'strong',
                        description: nls.localize('JsonSchema.args.quotesString.quote', 'How the argument value should be quoted.')
                    }
                }
            }
        ]
    },
    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.')
};
const label = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.label', "The task's user interface label")
};
const version = {
    type: 'string',
    enum: ['2.0.0'],
    description: nls.localize('JsonSchema.version', 'The config\'s version number.')
};
const identifier = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.identifier', 'A user defined identifier to reference the task in launch.json or a dependsOn clause.'),
    deprecationMessage: nls.localize('JsonSchema.tasks.identifier.deprecated', 'User defined identifiers are deprecated. For custom task use the name as a reference and for tasks provided by extensions use their defined task identifier.')
};
const runOptions = {
    type: 'object',
    additionalProperties: false,
    properties: {
        reevaluateOnRerun: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.reevaluateOnRerun', 'Whether to reevaluate task variables on rerun.'),
            default: true
        },
        runOn: {
            type: 'string',
            enum: ['default', 'folderOpen'],
            description: nls.localize('JsonSchema.tasks.runOn', 'Configures when the task should be run. If set to folderOpen, then the task will be run automatically when the folder is opened.'),
            default: 'default'
        },
        instanceLimit: {
            type: 'number',
            description: nls.localize('JsonSchema.tasks.instanceLimit', 'The number of instances of the task that are allowed to run simultaneously.'),
            default: 1
        },
        instancePolicy: {
            type: 'string',
            enum: ['terminateNewest', 'terminateOldest', 'prompt', 'warn', 'silent'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.instancePolicy.terminateNewest', 'Terminates the newest instance.'),
                nls.localize('JsonSchema.tasks.instancePolicy.terminateOldest', 'Terminates the oldest instance.'),
                nls.localize('JsonSchema.tasks.instancePolicy.prompt', 'Asks which instance to terminate.'),
                nls.localize('JsonSchema.tasks.instancePolicy.warn', 'Does nothing but warns that the instance limit has been reached.'),
                nls.localize('JsonSchema.tasks.instancePolicy.silent', 'Does nothing.'),
            ],
            description: nls.localize('JsonSchema.tasks.instancePolicy', 'Policy to apply when instance limit is reached.'),
            default: 'prompt'
        }
    },
    description: nls.localize('JsonSchema.tasks.runOptions', 'The task\'s run related options')
};
const commonSchemaDefinitions = commonSchema.definitions;
const options = Objects.deepClone(commonSchemaDefinitions.options);
const optionsProperties = options.properties;
optionsProperties.shell = Objects.deepClone(commonSchemaDefinitions.shellConfiguration);
const taskConfiguration = {
    type: 'object',
    additionalProperties: false,
    properties: {
        label: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskLabel', "The task's label")
        },
        taskName: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskName', 'The task\'s name'),
            deprecationMessage: nls.localize('JsonSchema.tasks.taskName.deprecated', 'The task\'s name property is deprecated. Use the label property instead.')
        },
        identifier: Objects.deepClone(identifier),
        group: Objects.deepClone(group),
        isBackground: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.background', 'Whether the executed task is kept alive and is running in the background.'),
            default: true
        },
        promptOnClose: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.promptOnClose', 'Whether the user is prompted when VS Code closes with a running task.'),
            default: false
        },
        presentation: Objects.deepClone(presentation),
        icon: Objects.deepClone(icon),
        hide: Objects.deepClone(hide),
        options: options,
        problemMatcher: {
            $ref: '#/definitions/problemMatcherType',
            description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
        },
        runOptions: Objects.deepClone(runOptions),
        dependsOn: Objects.deepClone(dependsOn),
        dependsOrder: Objects.deepClone(dependsOrder),
        detail: Objects.deepClone(detail),
    }
};
const taskDefinitions = [];
TaskDefinitionRegistry.onReady().then(() => {
    updateTaskDefinitions();
});
export function updateTaskDefinitions() {
    for (const taskType of TaskDefinitionRegistry.all()) {
        // Check that we haven't already added this task type
        if (taskDefinitions.find(schema => {
            return schema.properties?.type?.enum?.find ? schema.properties?.type.enum.find(element => element === taskType.taskType) : undefined;
        })) {
            continue;
        }
        const schema = Objects.deepClone(taskConfiguration);
        const schemaProperties = schema.properties;
        // Since we do this after the schema is assigned we need to patch the refs.
        schemaProperties.type = {
            type: 'string',
            description: nls.localize('JsonSchema.customizations.customizes.type', 'The task type to customize'),
            enum: [taskType.taskType]
        };
        if (taskType.required) {
            schema.required = taskType.required.slice();
        }
        else {
            schema.required = [];
        }
        // Customized tasks require that the task type be set.
        schema.required.push('type');
        if (taskType.properties) {
            for (const key of Object.keys(taskType.properties)) {
                const property = taskType.properties[key];
                schemaProperties[key] = Objects.deepClone(property);
            }
        }
        fixReferences(schema);
        taskDefinitions.push(schema);
    }
}
const customize = Objects.deepClone(taskConfiguration);
customize.properties.customize = {
    type: 'string',
    deprecationMessage: nls.localize('JsonSchema.tasks.customize.deprecated', 'The customize property is deprecated. See the 1.14 release notes on how to migrate to the new task customization approach')
};
if (!customize.required) {
    customize.required = [];
}
customize.required.push('customize');
taskDefinitions.push(customize);
const definitions = Objects.deepClone(commonSchemaDefinitions);
const taskDescription = definitions.taskDescription;
taskDescription.required = ['label'];
const taskDescriptionProperties = taskDescription.properties;
taskDescriptionProperties.label = Objects.deepClone(label);
taskDescriptionProperties.command = Objects.deepClone(command);
taskDescriptionProperties.args = Objects.deepClone(args);
taskDescriptionProperties.isShellCommand = Objects.deepClone(shellCommand);
taskDescriptionProperties.dependsOn = dependsOn;
taskDescriptionProperties.hide = Objects.deepClone(hide);
taskDescriptionProperties.dependsOrder = dependsOrder;
taskDescriptionProperties.identifier = Objects.deepClone(identifier);
taskDescriptionProperties.type = Objects.deepClone(taskType);
taskDescriptionProperties.presentation = Objects.deepClone(presentation);
taskDescriptionProperties.terminal = terminal;
taskDescriptionProperties.icon = Objects.deepClone(icon);
taskDescriptionProperties.group = Objects.deepClone(group);
taskDescriptionProperties.runOptions = Objects.deepClone(runOptions);
taskDescriptionProperties.detail = detail;
taskDescriptionProperties.taskName.deprecationMessage = nls.localize('JsonSchema.tasks.taskName.deprecated', 'The task\'s name property is deprecated. Use the label property instead.');
// Clone the taskDescription for process task before setting a default to prevent two defaults #115281
const processTask = Objects.deepClone(taskDescription);
taskDescription.default = {
    label: 'My Task',
    type: 'shell',
    command: 'echo Hello',
    problemMatcher: []
};
definitions.showOutputType.deprecationMessage = nls.localize('JsonSchema.tasks.showOutput.deprecated', 'The property showOutput is deprecated. Use the reveal property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.echoCommand.deprecationMessage = nls.localize('JsonSchema.tasks.echoCommand.deprecated', 'The property echoCommand is deprecated. Use the echo property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
taskDescriptionProperties.isBuildCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isBuildCommand.deprecated', 'The property isBuildCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
taskDescriptionProperties.isTestCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isTestCommand.deprecated', 'The property isTestCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
// Process tasks are almost identical schema-wise to shell tasks, but they are required to have a command
processTask.properties.type = {
    type: 'string',
    enum: ['process'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.')
};
processTask.required.push('command');
processTask.required.push('type');
taskDefinitions.push(processTask);
taskDefinitions.push({
    $ref: '#/definitions/taskDescription'
});
const definitionsTaskRunnerConfigurationProperties = definitions.taskRunnerConfiguration.properties;
const tasks = definitionsTaskRunnerConfigurationProperties.tasks;
tasks.items = {
    oneOf: taskDefinitions
};
definitionsTaskRunnerConfigurationProperties.inputs = inputsSchema.definitions.inputs;
definitions.commandConfiguration.properties.isShellCommand = Objects.deepClone(shellCommand);
definitions.commandConfiguration.properties.args = Objects.deepClone(args);
definitions.options.properties.shell = {
    $ref: '#/definitions/shellConfiguration'
};
definitionsTaskRunnerConfigurationProperties.isShellCommand = Objects.deepClone(shellCommand);
definitionsTaskRunnerConfigurationProperties.type = Objects.deepClone(taskType);
definitionsTaskRunnerConfigurationProperties.group = Objects.deepClone(group);
definitionsTaskRunnerConfigurationProperties.presentation = Objects.deepClone(presentation);
definitionsTaskRunnerConfigurationProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
definitionsTaskRunnerConfigurationProperties.taskSelector.deprecationMessage = nls.localize('JsonSchema.tasks.taskSelector.deprecated', 'The property taskSelector is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
const osSpecificTaskRunnerConfiguration = Objects.deepClone(definitions.taskRunnerConfiguration);
delete osSpecificTaskRunnerConfiguration.properties.tasks;
osSpecificTaskRunnerConfiguration.additionalProperties = false;
definitions.osSpecificTaskRunnerConfiguration = osSpecificTaskRunnerConfiguration;
definitionsTaskRunnerConfigurationProperties.version = Objects.deepClone(version);
const schema = {
    oneOf: [
        {
            'allOf': [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: Objects.deepClone(version),
                        windows: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.windows', 'Windows specific command configuration')
                        },
                        osx: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.mac', 'Mac specific command configuration')
                        },
                        linux: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.linux', 'Linux specific command configuration')
                        }
                    }
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration'
                }
            ]
        }
    ]
};
schema.definitions = definitions;
function deprecatedVariableMessage(schemaMap, property) {
    const mapAtProperty = schemaMap[property].properties;
    if (mapAtProperty) {
        Object.keys(mapAtProperty).forEach(name => {
            deprecatedVariableMessage(mapAtProperty, name);
        });
    }
    else {
        ConfigurationResolverUtils.applyDeprecatedVariableMessage(schemaMap[property]);
    }
}
Object.getOwnPropertyNames(definitions).forEach(key => {
    const newKey = key + '2';
    definitions[newKey] = definitions[key];
    delete definitions[key];
    deprecatedVariableMessage(definitions, newKey);
});
fixReferences(schema);
export function updateProblemMatchers() {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map(key => '$' + key);
        definitions.problemMatcherType2.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType2.oneOf[2].items.anyOf[0].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
}
ProblemMatcherRegistry.onReady().then(() => {
    updateProblemMatchers();
});
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92Mi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL2pzb25TY2hlbWFfdjIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBRzlELE9BQU8sWUFBWSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzdELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sS0FBSywwQkFBMEIsTUFBTSw4RUFBOEUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLFNBQVMsYUFBYSxDQUFDLE9BQVk7SUFDbEMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNoQyxDQUFDO1NBQU0sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lB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