'use strict';

import { workspace } from 'vscode';
import * as request from 'request';

function getGerritURI(): string | null | undefined {
    let uri = workspace.getConfiguration('gerrit-review').get('gerrit.host');
    if (!uri) {
        return undefined;
    }
    return uri.toString();
}

export function getReview(change: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        let base = getGerritURI();
        if (!base) {
            reject(Error('Gerrit host URI is not configured.'));
            return;
        }
        let uri = `${base}/changes/${change}/comments`;
        request.get(uri, function (error, _response, body) {
            if (error) {
                reject(Error(`Failed to load review comments for change ${change}`));
                return;
            }
            resolve(toJSON(body));
        });
    });
}

export function getChange(change: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        let base = getGerritURI();
        if (!base) {
            reject(Error('Gerrit host URI is not configured.'));
            return;
        }
        var uri = `${base}/changes/${change}?o=ALL_REVISIONS&o=CURRENT_COMMIT`;
        request.get(uri, function (error, _response, body) {
            if (error) {
                reject(Error(`Failed to load change ${change}`));
                return;
            }
            resolve(toJSON(body));
        });
    });
}

function toJSON(body: string) {
    return JSON.parse(body.substring(")]}'".length));
}
