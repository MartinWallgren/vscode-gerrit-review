'use strict';

import * as request from 'request';

//const GERRIT = 'https://gerrit-review.googlesource.com';
const GERRIT = 'https://android-review.googlesource.com';

export function getReview(change: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        var uri = `${GERRIT}/changes/${change}/comments`;
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
        var uri = `${GERRIT}/changes/${change}?o=ALL_REVISIONS&o=CURRENT_COMMIT`;
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
