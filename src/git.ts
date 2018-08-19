'use strict';
import { exec } from 'child_process';

export function getGitRoot(path: string): Promise<string> {
    return command(`git -C ${path} rev-parse --show-toplevel`, false);
}

/**
 * Get the commitID of the HEAD in the given gitRoot.
 *
 * @param gitRoot the path to the git root
 * @returns a Promise that resolves to a tuple with [gitRoot, commitId]
 */
export function getHEAD(gitRoot: string): Promise<[string, string]> {
    return new Promise((resolve, reject) => {
        command(`git -C ${gitRoot} rev-parse HEAD`)
            .then(commitId => {
                resolve([gitRoot, commitId]);
            });
    });
}

export function ls_remote(gitRoot: string, args?: ReadonlyArray<string>): Promise<string> {
    let cmd = `git -C ${gitRoot} ls-remote ` + (args ? args.join(' ') : '');
    return command(cmd);
}

function command(command: string, rejectError:boolean = true): Promise<string> {

    return new Promise<string>((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 16 }, (error, stdout, _stderr) => {
            if (error) {
                if (rejectError) {
                    reject(`git command error: ${error}`);
                } else {
                    resolve();
                }
                return;
            }
            resolve(stdout.trim()); // trim trailing newline.
        });
    });

}