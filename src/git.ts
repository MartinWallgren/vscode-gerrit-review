'use strict';
import * as vscode from 'vscode';
import { exec } from 'child_process';


export function getHEAD(): Promise<string> {
    if (!vscode.workspace.rootPath) {
        console.warn('No directory path in workspace.');
        return new Promise<string>(function (_resolve, reject) { reject(); });
    }
    return command(`git -C ${vscode.workspace.rootPath} rev-parse HEAD`);
}

export function ls_remote(args?: ReadonlyArray<string>): Promise<string> {
    if (!vscode.workspace.rootPath) {
        console.warn('No directory path in workspace.');
        return new Promise<string>(function (_resolve, reject) { reject(); });
    }
    let cmd = `git -C ${vscode.workspace.rootPath} ls-remote ` + (args? args.join(' ') : '');
    return command(cmd);
}

function command(command: string): Promise<string> {

    return new Promise<string>((resolve, reject) => {
        exec(command, {maxBuffer: 1024 * 1024 * 4}, (error, stdout, _stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject();
                return;
            }
            resolve(stdout.trim()); // trim trailing newline.
        });
    });

}