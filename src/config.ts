import * as vscode from 'vscode';

export class Config {
    private context: vscode.ExtensionContext;
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    private static readonly FILE_EXPLORER_DECORATION = {
        ok: {
            badge: '✓',
            tooltip: 'Reviewed',
            color: 'testing.iconPassed'
        },
        warning: {
            badge: '?',
            tooltip: 'Needs attention',
            color: 'editorWarning.foreground'
        },
        danger: {
            badge: '!',
            tooltip: 'Action required',
            color: 'testing.iconFailed'
        },
        clear: {
            badge: '',
            tooltip: '',
            color: ''
        },
        outOfScope: {
            badge: '⊘',
            tooltip: 'Out of scope',
            color: 'editorInfo.foreground'
        }
    }

    private static readonly COLORS = {
        green: { code: '#4caf500a', ruler: '#4caf50', darkIcon: 'green-dark.svg', lightIcon: 'green-light.svg' },
        red: { code: '#f443360a', ruler: '#f44336', darkIcon: 'red-dark.svg', lightIcon: 'red-light.svg' },
        yellow: { code: '#ffeb3b0a', ruler: '#ffeb3b', darkIcon: 'yellow-dark.svg', lightIcon: 'yellow-light.svg' }
    };

    private static readonly CODE_TO_COLOR = {
        'ok': 'green',
        'warning': 'yellow',
        'danger': 'red'
    };

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.setup();

        // Reload the cached values if the configuration changes
        vscode.workspace.onDidChangeConfiguration(this.setup.bind(this));
    }

    private getIconPath(iconName: string): string {
        return this.context.asAbsolutePath(`images/${iconName}`);
    }

    private makeDecorationRenderOptions(colorKey: string): vscode.DecorationRenderOptions {
        const colorConfig = Config.COLORS[colorKey as keyof typeof Config.COLORS];
        return {
            light: {
                backgroundColor: colorConfig.code,
                gutterIconPath: this.getIconPath(colorConfig.lightIcon),
                overviewRulerColor: colorConfig.ruler,
            },
            dark: {
                backgroundColor: colorConfig.code,
                gutterIconPath: this.getIconPath(colorConfig.darkIcon),
                overviewRulerColor: colorConfig.ruler,
            },
            isWholeLine: true,        
        };
    }

    private makeFileExplorerDecorationRenderOptions(fileDecorationKey: string): vscode.FileDecoration {
        const decorationConfig = Config.FILE_EXPLORER_DECORATION[fileDecorationKey as keyof typeof Config.FILE_EXPLORER_DECORATION];
        return {
            badge: decorationConfig.badge,
            tooltip: decorationConfig.tooltip,
            color: decorationConfig.color ? new vscode.ThemeColor(decorationConfig.color) : undefined,
        };
    }

    private setup(): void {
        // Dispose existing decoration types before recreating them
        this.decorationTypes.forEach(dt => dt.dispose());
        this.decorationTypes.clear();

        Object.keys(Config.COLORS).forEach(colorKey => {
            const decorationOptions = this.makeDecorationRenderOptions(colorKey);
            this.decorationTypes.set(colorKey, vscode.window.createTextEditorDecorationType(decorationOptions));
        });
    }

    public getDecorationType(colorKey: string): vscode.TextEditorDecorationType | undefined {
        return this.decorationTypes.get(Config.CODE_TO_COLOR[colorKey as keyof typeof Config.CODE_TO_COLOR]);
    }

    public getFileExplorerDecoration(fileDecorationKey: string): vscode.FileDecoration {
        return this.makeFileExplorerDecorationRenderOptions(fileDecorationKey);
    }
};
