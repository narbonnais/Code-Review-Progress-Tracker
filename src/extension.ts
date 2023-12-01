// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Config } from './config';
import { State } from './state';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-review-progress-tracker" is now active!');

	const config = new Config(context);
	const state = new State();

	let temp = context.workspaceState.get("State");
	if (temp) {
		state.loadFromJson(temp);
	}

	// Update files when vscode is opened.
	let updateDecorations = (activeEditor: vscode.TextEditor) => {
		if (!activeEditor) {
			return;
		}
		const path = activeEditor.document.uri.path.toString();
		const greenDecorationType = config.decorationTypes.get('green') as vscode.TextEditorDecorationType;
		const yellowDecorationType = config.decorationTypes.get('yellow') as vscode.TextEditorDecorationType;
		const redDecorationType = config.decorationTypes.get('red') as vscode.TextEditorDecorationType;
		const ranges_ok = state.getRanges("ok", path);
		const ranges_warning = state.getRanges("warning", path);
		const ranges_danger = state.getRanges("danger", path);
		if (ranges_ok) {
			activeEditor.setDecorations(greenDecorationType, ranges_ok);
		} else {
			activeEditor.setDecorations(greenDecorationType, []);
		}
		if (ranges_warning) {
			activeEditor.setDecorations(yellowDecorationType, ranges_warning);
		} else {
			activeEditor.setDecorations(yellowDecorationType, []);
		}
		if (ranges_danger) {
			activeEditor.setDecorations(redDecorationType, ranges_danger);
		} else {
			activeEditor.setDecorations(redDecorationType, []);
		}
		context.workspaceState.update("State", state.toJson());
	}
		// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let reviewOkDisposable = vscode.commands.registerCommand('code-review-progress-tracker.reviewedOk', () => {
		// The code you place here will be executed every time your command is executed

		// Set gutter decorations
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const path = editor.document.uri.path.toString();
		const firstLine = editor.selection.active;
		const lastLine = editor.selection.anchor;
		const textRange = new vscode.Range(firstLine, lastLine);
		state.removeRangeFromAllTypesInFile(path, textRange);
		state.addRange("ok", path, textRange);
		updateDecorations(editor);
	});

	let reviewWarningDisposable = vscode.commands.registerCommand('code-review-progress-tracker.reviewedWarning', () => {
		// The code you place here will be executed every time your command is executed

		// Set gutter decorations
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const path = editor.document.uri.path.toString();
		const firstLine = editor.selection.active;
		const lastLine = editor.selection.anchor;
		const textRange = new vscode.Range(firstLine, lastLine);
		state.removeRangeFromAllTypesInFile(path, textRange);
		state.addRange("warning", path, textRange);
		updateDecorations(editor);
	});

	let reviewDangerDisposable = vscode.commands.registerCommand('code-review-progress-tracker.reviewedDanger', () => {
		// The code you place here will be executed every time your command is executed

		// Set gutter decorations
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const path = editor.document.uri.path.toString();
		const firstLine = editor.selection.active;
		const lastLine = editor.selection.anchor;
		const textRange = new vscode.Range(firstLine, lastLine);
		state.removeRangeFromAllTypesInFile(path, textRange);
		state.addRange("danger", path, textRange);
		updateDecorations(editor);
	});

	let reviewClearDisposable = vscode.commands.registerCommand('code-review-progress-tracker.reviewedClear', () => {
		// The code you place here will be executed every time your command is executed

		// Set gutter decorations
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const path = editor.document.uri.path.toString();
		const firstLine = editor.selection.active;
		const lastLine = editor.selection.anchor;
		const textRange = new vscode.Range(firstLine, lastLine);
		state.removeRangeFromAllTypesInFile(path, textRange);
		updateDecorations(editor);
	});

	let reviewClearAllDisposable = vscode.commands.registerCommand('code-review-progress-tracker.reviewedClearAll', () => {
		// The code you place here will be executed every time your command is executed

		// Set gutter decorations
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const path = editor.document.uri.path.toString();
		state.clearFile(path);
		updateDecorations(editor);
	});

	let activeEditor: vscode.TextEditor | undefined = undefined;
	activeEditor = vscode.window.activeTextEditor!;
	updateDecorations(activeEditor);
	// When editor switches update activeEditor and update decorations.
	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			updateDecorations(editor);
		}
	}, null, context.subscriptions);

	// If file name changes update key for markedEditors
	vscode.workspace.onWillRenameFiles((event) => {
		event.files.forEach((files) => {
			const oldPath = files.oldUri.path.toString();
			const newPath = files.newUri.path.toString();
			state.changeFilename(oldPath, newPath);
		});
	}, null, context.subscriptions);


	context.subscriptions.push(reviewOkDisposable);
	context.subscriptions.push(reviewWarningDisposable);
	context.subscriptions.push(reviewDangerDisposable);
	context.subscriptions.push(reviewClearDisposable);
	context.subscriptions.push(reviewClearAllDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
