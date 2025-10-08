import * as vscode from 'vscode';
import { Config } from './config';
import { State } from './state';
import { CoverageTreeItem, CoverageView } from './coverageView';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "code-review-progress-tracker" is now active!');

    const config = new Config(context);
    const state = new State();
    const decorationsEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    const coverageView = new CoverageView(context, state);
    let coverageRefreshHandle: NodeJS.Timeout | undefined;
    const scheduleCoverageRefresh = () => {
        if (coverageRefreshHandle) {
            clearTimeout(coverageRefreshHandle);
        }
        coverageRefreshHandle = setTimeout(() => {
            coverageView.refresh();
            coverageRefreshHandle = undefined;
        }, 300);
    };
    const syncCoverageSelection = (editor: vscode.TextEditor | undefined) => {
        if (!editor) {
            void coverageView.revealFile(undefined);
            return;
        }
        void coverageView.revealFile(editor.document.uri);
    };
    const persistState = () => {
        scheduleCoverageRefresh();
        return context.workspaceState.update("State", state.toJson());
    };
    context.subscriptions.push({ dispose: () => {
        if (coverageRefreshHandle) {
            clearTimeout(coverageRefreshHandle);
        }
    }});

    // Register a single FileDecorationProvider driven by an event emitter
    const fileDecorationProvider: vscode.FileDecorationProvider = {
        onDidChangeFileDecorations: decorationsEmitter.event,
        provideFileDecoration: async (uri: vscode.Uri) => {
            const key = uri.toString();
            const status = state.getFileReviewStatus(key);
            const directIgnore = state.getDirectIgnoredType(key);
            const ignored = state.isIgnored(key);
            let stat: vscode.FileStat | undefined;
            try {
                stat = await vscode.workspace.fs.stat(uri);
            } catch {
                stat = undefined;
            }
            const isDirectory = stat ? (stat.type & vscode.FileType.Directory) !== 0 : false;

            if (status && status !== 'clear') {
                return config.getFileExplorerDecoration(status);
            }

            if (!isDirectory && (directIgnore === 'file' || (ignored && status !== 'clear'))) {
                return new vscode.FileDecoration('⊘', 'Ignored from review scope', new vscode.ThemeColor('editorInfo.foreground'));
            }

            if (isDirectory) {
                if (directIgnore === 'folder') {
                    return new vscode.FileDecoration('⊘', 'Ignored folder in review scope', new vscode.ThemeColor('editorInfo.foreground'));
                }
                if (ignored) {
                    return new vscode.FileDecoration('⊘', 'Ignored by parent scope', new vscode.ThemeColor('editorInfo.foreground'));
                }
                if (state.hasTrackedDescendants(key)) {
                    return new vscode.FileDecoration('R', 'Contains review scope items', undefined);
                }
            } else {
                if (status === 'clear' || state.isTracked(key)) {
                    return new vscode.FileDecoration('R', 'In review scope', undefined);
                }
            }
        }
    };
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(fileDecorationProvider));

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
            // Refresh all file decorations based on restored state
            decorationsEmitter.fire(undefined);
            coverageView.refresh();
        }
    }
    catch (e) {
        // Something went wrong, clear the state
        state.clearAllFiles();
        void persistState();
    }

    const updateDecorations = (activeEditor: vscode.TextEditor) => {
        if (!activeEditor) return;
        const path = activeEditor.document.uri.toString();
        ['ok', 'warning', 'danger'].forEach(status => {
            const decorationType = config.getDecorationType(status);
            const ranges = state.getRanges(status as 'ok' | 'warning' | 'danger', path);
            if (decorationType) {
                activeEditor.setDecorations(decorationType, ranges || []);
            }
        });
    }

    const handleReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear') => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const path = editor.document.uri.toString();
        const textRange = new vscode.Range(editor.selection.start, editor.selection.end);

        if (type !== 'clear') {
            state.removeRangeFromAllTypesInFile(path, textRange);
            state.addRange(type, path, textRange);
        } else {
            state.removeRangeFromAllTypesInFile(path, textRange);
        }

        updateDecorations(editor);
        void persistState();
    }

    const handleFileReviewCommand = (type: 'ok' | 'warning' | 'danger' | 'clear' | 'outOfScope') => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const path = editor.document.uri.toString();

        if (type !== 'clear') {
            state.setFileReviewStatus(path, type);
        } else {
            state.clearFileReviewStatus(path);
        }
        // Persist and refresh decorations
        decorationsEmitter.fire(undefined);
        void persistState();

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
            state.clearFile(editor.document.uri.toString());
            updateDecorations(editor);
            void persistState();
        }),
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) updateDecorations(editor);
            syncCoverageSelection(editor);
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            const docKey = e.document.uri.toString();
            // Adjust stored ranges per content change
            for (const change of e.contentChanges) {
                const newLineCount = (change.text.match(/\n/g) || []).length;
                const oldLineCount = change.range.end.line - change.range.start.line;
                const delta = newLineCount - oldLineCount;
                if (delta !== 0) {
                    state.applyLineDelta(docKey, change.range.start.line, change.range.end.line, delta);
                }
            }
            const active = vscode.window.activeTextEditor;
            if (active && active.document.uri.toString() === docKey) {
                updateDecorations(active);
            }
            void persistState();
        }),
        vscode.workspace.onWillRenameFiles(event => {
            event.files.forEach(file => {
                state.changeFilename(file.oldUri.toString(), file.newUri.toString());
            });
            // Persist and refresh decorations for affected URIs
            decorationsEmitter.fire(event.files.flatMap(f => [f.oldUri, f.newUri]));
            void persistState();
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.coverage.refresh', () => {
            coverageView.refresh();
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.scope.add', async (item?: CoverageTreeItem | vscode.Uri, selection?: (CoverageTreeItem | vscode.Uri)[]) => {
            await coverageView.addToScope(item, selection);
            decorationsEmitter.fire(undefined);
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.scope.remove', async (item?: CoverageTreeItem | vscode.Uri, selection?: (CoverageTreeItem | vscode.Uri)[]) => {
            await coverageView.removeFromScope(item, selection);
            decorationsEmitter.fire(undefined);
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.scope.ignore', async (item?: CoverageTreeItem | vscode.Uri, selection?: (CoverageTreeItem | vscode.Uri)[]) => {
            await coverageView.ignore(item, selection);
            decorationsEmitter.fire(undefined);
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.coverage.ignore', async (item?: CoverageTreeItem | vscode.Uri, selection?: (CoverageTreeItem | vscode.Uri)[]) => {
            await coverageView.ignore(item, selection);
            decorationsEmitter.fire(undefined);
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.coverage.include', async (item?: CoverageTreeItem | vscode.Uri, selection?: (CoverageTreeItem | vscode.Uri)[]) => {
            await coverageView.unignore(item, selection);
            decorationsEmitter.fire(undefined);
        }),
        vscode.commands.registerCommand('code-review-progress-tracker.coverage.clearIgnores', async () => {
            await coverageView.clearIgnores();
        })
    );

    const initialEditor = vscode.window.activeTextEditor;
    if (initialEditor) {
        updateDecorations(initialEditor);
    }
    syncCoverageSelection(initialEditor);
}

export function deactivate() { }
