'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as git from './git';
import * as review from './review';
import { isString } from 'util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "gerrit-review" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.loadReview', () => {
        let paths: string[] = [];
        if (vscode.workspace.workspaceFolders) {
            paths = vscode.workspace.workspaceFolders.filter(folder => {
                return folder.uri.scheme === 'file';
            }).map(folder => {
                return folder.uri.fsPath;
            });
        }
        Promise.all(paths.map(git.getGitRoot))
            .then(gitRoots => {
                if (gitRoots.length === 0) {
                    vscode.window.showErrorMessage('Unable to load code review. No git repo found.');
                }
                gitRoots = gitRoots.filter(isString); // Non git directories will be undefined in the result.
                if (gitRoots.length === 1) {
                    review.loadReview(gitRoots[0]);
                    return;
                }
                vscode.window.showQuickPick(gitRoots,
                    {
                        placeHolder: "Select git repo with the code review."
                    })
                    .then(gitRoot => {
                        if (gitRoot) {
                            review.loadReview(gitRoot);
                        }
                    });
            }).catch(reason => { vscode.window.showErrorMessage('Unable to load code review. No git repo found.'); });
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}