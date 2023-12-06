import * as vscode from 'vscode';
import { Config } from './config';
import { State } from './state';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "code-review-progress-tracker" is now active!');

    const config = new Config(context);
    const state = new State();

    // // modify file name color in explorer
    // const fileDecoration = new vscode.FileDecoration(
    //     '✓',
    //     'Reviewed',
    //     new vscode.ThemeColor('#00ff00'),
        
    // );
    // console.log(fileDecoration);

    // const fileDecorationProvider = vscode.window.registerFileDecorationProvider({
        
    //     provideFileDecoration: (uri: vscode.Uri) => {
    //         // URI is current file
    //         if (vscode.window.activeTextEditor?.document.uri.path === uri.path) {
    //             return fileDecoration;
    //         }
    //     },
    // });

    try {
        let temp = context.workspaceState.get("State");
        if (temp) {
            state.loadFromJson(temp);
            
            const fileDecorationProvider = vscode.window.registerFileDecorationProvider({
                provideFileDecoration: (uri: vscode.Uri) => {
                    const path = uri.path.toString();
                    const status = state.getFileReviewStatus(path);
                    if (status) {
                        const fileDecoration = config.getFileExplorerDecoration(status);
                        if (fileDecoration) {
                            return fileDecoration;
                        }
                    }
                }
            });
            state.setDisposable(fileDecorationProvider);
        }
    }
    catch (e) {
        // Something went wrong, clear the state
        state.clearAllFiles();
    }

    const updateDecorations = (activeEditor: vscode.TextEditor) => {
        if (!activeEditor) return;
        const path = activeEditor.document.uri.path.toString();
        ['ok', 'warning', 'danger'].forEach(status => {
            const decorationType = config.getDecorationType(status);
            const ranges = state.getRanges(status as 'ok' | 'warning' | 'danger', path);
            if (decorationType) {
                activeEditor.setDecorations(decorationType, ranges || []);
            }
        });
        context.workspaceState.update("State", state.toJson());
    }

    const handleReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear') => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const path = editor.document.uri.path.toString();
        const textRange = new vscode.Range(editor.selection.start, editor.selection.end);

        if (type !== 'clear') {
            state.removeRangeFromAllTypesInFile(path, textRange);
            state.addRange(type, path, textRange);
        } else {
            state.removeRangeFromAllTypesInFile(path, textRange);
        }

        updateDecorations(editor);
    }

    const handleFileReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear' | 'outOfScope') => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const path = editor.document.uri.path.toString();

        if (type !== 'clear') {
            state.setFileReviewStatus(path, type);
        } else {
            state.clearFileReviewStatus(path);
        }

        state.deleteDispoable();
        const fileDecorationProvider = vscode.window.registerFileDecorationProvider({
            provideFileDecoration: (uri: vscode.Uri) => {
                const path = uri.path.toString();
                const status = state.getFileReviewStatus(path);
                if (status) {
                    const fileDecoration = config.getFileExplorerDecoration(status);
                    if (fileDecoration) {
                        return fileDecoration;
                    }
                }
            }
        });
        state.setDisposable(fileDecorationProvider);

    }

    const registerReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear') => {
        let commandId = `code-review-progress-tracker.reviewed${type.charAt(0).toUpperCase() + type.slice(1)}`;
        return vscode.commands.registerCommand(commandId, () => handleReviewCommand(type));
    }
    
    const registerFileReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear' | 'outOfScope') => {
        let commandId = `code-review-progress-tracker.reviewedFile${type.charAt(0).toUpperCase() + type.slice(1)}`;
        return vscode.commands.registerCommand(commandId, () => handleFileReviewCommand(type));
    }

    context.subscriptions.push(
        registerReviewCommand('ok'),
        registerReviewCommand('warning'),
        registerReviewCommand('danger'),
        registerReviewCommand('clear'),
        registerFileReviewCommand('ok'),
        registerFileReviewCommand('warning'),
        registerFileReviewCommand('danger'),
        registerFileReviewCommand('clear'),
        registerFileReviewCommand('outOfScope'),
        vscode.commands.registerCommand('code-review-progress-tracker.reviewedClearAll', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            state.clearFile(editor.document.uri.path.toString());
            updateDecorations(editor);
        }),
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) updateDecorations(editor);
        }),
        vscode.workspace.onWillRenameFiles(event => {
            event.files.forEach(file => {
                state.changeFilename(file.oldUri.path.toString(), file.newUri.path.toString());
            });
        })
    );

}

export function deactivate() { }
