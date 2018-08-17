'use strict';

import * as gerrit from './gerrit';
import * as git from './git';
import * as vscode from 'vscode';

const HIGHLIGHT = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

var currentReview: any | undefined;
var currentChange: any | undefined; // {change: nbr, patchSet: ps}

vscode.window.onDidChangeVisibleTextEditors(onVisibleEditorsChanged);

export function onChangeLoaded(change: any) {
    currentReview = undefined;
    currentChange = change;
    gerrit.getReview(change.change).then(onReviewLoaded);
}

function onReviewLoaded(review: any) {
    currentReview = review;
    if (!currentChange) {
        return;
    }
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(currentChange.patchSet, review, editor);
    }
}

function onVisibleEditorsChanged(editors: vscode.TextEditor[]) {
    if (!currentReview || !currentChange) {
        return;
    }
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(currentChange.patchSet, currentReview, editor);
    }
}

function getPatchset(sha1: string, change: any): number | undefined {
    if (change.revisions[sha1]) {
        return change.revisions[sha1]._number;
    }
}

function highlightReview(patchSet: number, review: any, editor: vscode.TextEditor) {
    let path = editor.document.fileName;
    if (!path) {
        // Editor not connected to a file (new untitled document etc).
        return;
    }
    let relativePath = vscode.workspace.asRelativePath(path);
    if (!review[relativePath]) {
        // No review comments for this file.
        return;
    }
    let highlights: vscode.DecorationOptions[] = [];
    for (let comment of review[relativePath]) {
        if (comment.patch_set === patchSet) {
            let range = getRange(comment, editor);
            let msg = `${comment.author.name}: ${comment.message}`;
            highlights.push({ hoverMessage: msg, range: range });
        }
    }
    editor.setDecorations(HIGHLIGHT, highlights);
}

function getRange(commentInfo: any, editor: vscode.TextEditor): vscode.Range {
    if (commentInfo.range) {
        // Selection comment
        return new vscode.Range(
            commentInfo.range.start_line - 1,
            commentInfo.range.start_character,
            commentInfo.range.end_line - 1,
            commentInfo.range.end_character);
    }

    if (commentInfo.line) {
        // Line comment
        let line = commentInfo.line - 1; // Gerrit lines are 1-based.
        return editor.document.lineAt(line).range;
    }
    // File comment
    return new vscode.Range(commentInfo.line - 1, 0, commentInfo.line - 1, 0);
}

export function getChange(commitId: string): Promise<any> {
    return git.ls_remote()
        .then(remoteRefs => {
            return new Promise<any>((resolve, reject) => {
                for (let ref of remoteRefs.split('\n')) {
                    if (ref.startsWith(commitId)) {
                        let change = getChangeNbrByRef(ref);
                        if (change) {
                            resolve(change);
                            return;
                        }
                    }
                }
                reject(Error(`No change found for commit ${commitId}`));
            });
        });
}

function getChangeNbrByRef(ref: string): any | undefined {
    //ref on the form 46c82b4cd241a447834ed2f5a6be16777b7a990b	refs/changes/80/116780/3
    let index = ref.indexOf('refs/changes/');
    if (!index) {
        // Not a change ref
        return;
    }
    let change = Number(ref.substring(index).split('/')[3]);
    let patchSet = Number(ref.substring(index).split('/')[4]);

    return { change: change, patchSet: patchSet };
}