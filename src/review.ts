'use strict';

import * as gerrit from './gerrit';
import * as git from './git';
import * as vscode from 'vscode';

const HIGHLIGHT = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

var currentReview: any | undefined;
var patchSet: number | undefined; // Locally checked out patchset of the current change.

vscode.window.onDidChangeVisibleTextEditors(onVisibleEditorsChanged);

export function onChangeLoaded(change: any) {
    currentReview = undefined;
    patchSet = undefined;
    console.log('onChangeLoaded: ' + change._number);
    git.getHEAD().then(head => {
        console.log('HEAD: ' + head);
        if (!head) {
            return;
        }
        patchSet = getPatchset(head, change);
        if (!patchSet) {
            // None of the patchsets of the change are currently checked out.
            return;
        }
        gerrit.getReview(change._number).then(onReviewLoaded);
    });
}

function onReviewLoaded(review: any) {
    currentReview = review;
    if (!patchSet) {
        return;
    }
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(patchSet, review, editor);
    }
}

function onVisibleEditorsChanged(editors: vscode.TextEditor[]) {
    if (!currentReview || !patchSet) {
        return;
    }
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(patchSet, currentReview, editor);
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