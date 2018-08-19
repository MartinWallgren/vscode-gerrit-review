'use strict';

import * as gerrit from './gerrit';
import * as git from './git';
import * as vscode from 'vscode';

const HIGHLIGHT = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

/**
 * The review for the current HEAD.
 * Will be undefined if no review has been loaded or
 * if no review exists for the current HEAD.
 */
var currentReview: Review | undefined;

vscode.window.onDidChangeVisibleTextEditors(onVisibleEditorsChanged);

/**
 * A Review represents a patchset of a change with comments.
 */
class Review {
    constructor(
        public gitRoot: string,
        public commitId: string,

        /**
         * Note, this is all comments for the Change, not just for this patch set.
         */
        public comments: { [key: string]: gerrit.CommentInfo[] },
        public changeNbr: number,
        public patchSet: number
    ) { }
}

export function loadReview(gitRoot: string) {
    git.getHEAD(gitRoot)
        .then(head => { return getReview(head[0], head[1]); })
        .then(onReviewLoaded)
        .catch(reason => {
            vscode.window.showErrorMessage(`Unable to load review: ${reason}`);
        });
}

export function onReviewLoaded(review: Review) {
    currentReview = review;
    gerrit.getComments(review.changeNbr)
        .then(onCommentsLoaded)
        .catch((err) => {
            vscode.window.showErrorMessage(`Unable to load review: ${err.message}`);
        });
}

function onCommentsLoaded(comments: { [key: string]: gerrit.CommentInfo[] }) {
    if (!currentReview) {
        return;
    }
    currentReview.comments = comments;
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(currentReview, editor);
    }
    vscode.window.showInformationMessage(
        `Comments loaded for change ${currentReview.changeNbr}/${currentReview.patchSet}.`);
}

function onVisibleEditorsChanged(editors: vscode.TextEditor[]) {
    if (!currentReview) {
        return;
    }
    for (let editor of vscode.window.visibleTextEditors) {
        highlightReview(currentReview, editor);
    }
}


function highlightReview(review: Review, editor: vscode.TextEditor) {
    let path = editor.document.fileName;
    if (!path) {
        // Editor not connected to a file (new untitled document etc).
        return;
    }
    let relativePath = vscode.workspace.asRelativePath(path, false);
    if (!review.comments[relativePath]) {
        // No review comments for this file.
        return;
    }
    let highlights: vscode.DecorationOptions[] = [];
    for (let comment of review.comments[relativePath]) {
        if (comment.patch_set === review.patchSet) {
            let range = getRange(comment, editor);
            let author = undefined;
            if (comment.author) {
                author = comment.author.name;
            }
            let msg = `${author}: ${comment.message}`;
            highlights.push({ hoverMessage: msg, range: range });
        }
    }
    editor.setDecorations(HIGHLIGHT, highlights);
}

function getRange(commentInfo: gerrit.CommentInfo, editor: vscode.TextEditor): vscode.Range {
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
    // File comment, place them on the first line for now.
    return editor.document.lineAt(0).range;
}

/**
 * Get the review for the given commitId.
 *
 * @returns a Review for the commit if one exists
 * @param commitId a commit sha1 to lookup a review for
 */
export function getReview(gitRoot: string, commitId: string): Promise<Review> {
    return git.ls_remote(gitRoot, [
        '--refs',                   // Do not show peeled tags or pseudorefs like HEAD in the output.
        '--sort="version:refname"', // Sort on refname to get a sane order for the user.
        'origin',                   // the remote (TODO: allow remotes other than origin)
        '"refs/changes/*/*/*"'])    // filter out refs/changes only
        .then(remoteRefs => {
            return new Promise<Review>((resolve, reject) => {
                // ls-remote will return lines on the form:
                // 46c82b4cd241a447834ed2f5a6be16777b7a990b	refs/changes/80/116780/3
                let refs = remoteRefs.split('\n').filter(ref => { return ref.startsWith(commitId); });
                if (refs.length === 0) {
                    reject(`No change found for commit ${commitId}`);
                    return;
                }
                refs = refs.map(ref => {
                    return ref.substring(ref.indexOf('refs/changes'));
                });
                if (refs.length === 1) {
                    resolve(toReview(gitRoot, commitId, refs[0]));
                } else {
                    vscode.window.showQuickPick(refs,
                        {
                            placeHolder: "Pick the change you want to load comments for.",
                            ignoreFocusOut: true
                        }
                    ).then(ref => {
                        if (ref) {
                            resolve(toReview(gitRoot, commitId, ref));
                        }
                    });
                }
            });
        });
}

/**
 * Create a Review instance
 *
 * Note, comments of the Review will not be fetched and thus
 * remain undefined.
 *
 * @param commitId the commitId of the commit in the patchset
 * @param ref reference on the form 'refs/changes/80/116780/3'
 */
function toReview(gitRoot: string, commitId: string, ref: string): Review {
    let parts = ref.split('/');
    let changeNbr = Number(parts[3]);
    let patchSet = Number(parts[4]);
    return new Review(gitRoot, commitId, {}, changeNbr, patchSet);
}
