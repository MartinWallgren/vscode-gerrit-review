'use strict';

import { workspace } from 'vscode';
import * as request from 'request';

export class AccountInfo {
    constructor(
        public _account_id: number,
        public name: string | undefined,
        public email: string | undefined,
        public secondary_emails: string | undefined,
        public username: string | undefined,
        public _more_accounts: boolean | undefined
    ) { }
}

export class CommentRange {
    constructor(
        public start_line: number,
        public start_character: number,
        public end_line: number,
        public end_character: number
    ) { }
}

export class CommentInfo {
    constructor(
        public patch_set: number | undefined,
        public id: string | undefined,
        public path: string | undefined,
        public side: string | undefined,
        public parent: number | undefined,
        public line: number | undefined,
        public range: CommentRange | undefined,
        public in_reply_to: string | undefined,
        public message: string | undefined,
        public updated: string,
        public author: AccountInfo | undefined,
        public tag: string | undefined,
        public unresolved: boolean | undefined
    ) { }
}

function getGerritURI(): string | null | undefined {
    let uri = workspace.getConfiguration('gerrit-review').get('gerrit.host');
    if (!uri) {
        return undefined;
    }
    return uri.toString();
}

/**
 * Get the review comments for the given change number.
 *
 * @returns map of file paths to list of comments.
 * @param changeNbr the number to identify the change.
 */
export function getComments(changeNbr: number): Promise<{ [key: string]: CommentInfo[] }> {
    return new Promise<{ [key: string]: CommentInfo[] }>((resolve, reject) => {
        let base = getGerritURI();
        if (!base) {
            reject(Error('Gerrit host URI is not configured.'));
            return;
        }
        let uri = `${base}/changes/${changeNbr}/comments`;
        request.get(uri, function (error, _response, body) {
            if (error) {
                reject(Error(`Failed to load review comments for change ${changeNbr}`));
                return;
            }
            resolve(toJSON(body) as { [key: string]: CommentInfo[] });
        });
    });
}

function toJSON(body: string) {
    return JSON.parse(body.substring(")]}'".length));
}
