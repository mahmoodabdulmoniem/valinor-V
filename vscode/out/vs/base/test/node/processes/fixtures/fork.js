/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as processes from '../../../../node/processes.js';
const sender = processes.createQueuedSender(process);
process.on('message', msg => {
    sender.send(msg);
});
sender.send('ready');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvcHJvY2Vzc2VzL2ZpeHR1cmVzL2ZvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFNBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUzRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQU0sT0FBTyxDQUFDLENBQUM7QUFFMUQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMifQ==