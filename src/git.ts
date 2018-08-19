'use strict';
import { exec } from 'child_process';

export function getGitRoot(path: string): Promise<string> {
    return command(`git -C ${path} rev-parse --show-toplevel`, false);
}

/**
 * Get the commitId of the HEAD in the given gitRoot.
 *
 * @param gitRoot the path to the git root
 * @returns a Promise that resolves to the commitId for HEAD
 */
export function getHEAD(gitRoot: string): Promise<string> {
    return new Promise((resolve, reject) => {
        command(`git -C ${gitRoot} rev-parse HEAD`)
            .then(commitId => {
                resolve(commitId);
            });
    });
}

export function ls_remote(gitRoot: string, args?: ReadonlyArray<string>): Promise<string> {
    let cmd = `git -C ${gitRoot} ls-remote ` + (args ? args.join(' ') : '');
    return command(cmd);
}

export class GitRemote {
    constructor(
        public name: string,
        public url: string
    ) { }
}
/**
 * List all remotes for the git repo.
 *
 * @param gitRoot the file path to the git repo.
 */
export function getRemotes(gitRoot: string): Promise<ReadonlyArray<GitRemote>> {
    return new Promise((resolve, reject) => {
        // Example output
        //   myfork  https://some.host/repo.git (fetch)
        //   myfork  https://some.host/repo.git (push)
        //   origin  https://origin.host/repo.git (fetch)
        //   origin  https://origin.host/repo.git (push)
        command(`git -C ${gitRoot} remote -v`)
            .then(stdout => {
                let lines: string[] = stdout.split('\n')
                    .filter(line => { return line.endsWith('(fetch)'); });
                let remotes: GitRemote[] = lines.map(line => {
                    let remote = line.match(/\S+/g) || [];
                    return { name: remote[0], url: remote[1] } as GitRemote;
                });
                resolve(remotes);
            })
            .catch(reject);
    });
}

function command(command: string, rejectError: boolean = true): Promise<string> {

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