import * as vscode from 'vscode';

export class Config {
    private context: vscode.ExtensionContext;

    private darkIcons: Map<string, string> = new Map();
    private lightIcons: Map<string, string> = new Map();
    private colorsCodes: Map<string, string> = new Map();
    private rulerColorCodes: Map<string, string> = new Map();
    private decorationRenderOptions: Map<string, vscode.DecorationRenderOptions> = new Map();

    public decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.setup();

        // Reload the cached values if the configuration changes
        vscode.workspace.onDidChangeConfiguration(this.setup.bind(this));
    }

    private getIconPath(iconName: string): string {
        return this.context.asAbsolutePath(`images/${iconName}`);
    }
    
    private makeDecorationRenderOptionsByColor(color: string): vscode.DecorationRenderOptions {
        const decoration: vscode.DecorationRenderOptions = {
            light: {
                backgroundColor: this.colorsCodes.get(color) as string,
                gutterIconPath: this.getIconPath(this.lightIcons.get(color) as string),
                overviewRulerColor: this.rulerColorCodes.get(color) as string,
            },
            dark: {
                backgroundColor: this.colorsCodes.get(color) as string,
                gutterIconPath: this.getIconPath(this.darkIcons.get(color) as string),
                overviewRulerColor: this.rulerColorCodes.get(color) as string,
            },
            isWholeLine: true,        
        };
        return decoration;
    }

    private setup(): void {
        
        this.darkIcons.set('green', 'green-dark.svg');
        this.darkIcons.set('red', 'red-dark.svg');
        this.darkIcons.set('yellow', 'yellow-dark.svg');

        this.lightIcons.set('green', 'green-light.svg');
        this.lightIcons.set('red', 'red-light.svg');
        this.lightIcons.set('yellow', 'yellow-light.svg');

        this.colorsCodes.set('green', '#4caf500a');
        this.colorsCodes.set('red', '#f443360a');
        this.colorsCodes.set('yellow', '#ffeb3b0a');

        this.rulerColorCodes.set('green', '#4caf50');
        this.rulerColorCodes.set('red', '#f44336');
        this.rulerColorCodes.set('yellow', '#ffeb3b');

        this.decorationRenderOptions.set('green', this.makeDecorationRenderOptionsByColor('green'));
        this.decorationRenderOptions.set('red', this.makeDecorationRenderOptionsByColor('red'));
        this.decorationRenderOptions.set('yellow', this.makeDecorationRenderOptionsByColor('yellow'));

        this.decorationTypes.set('green', vscode.window.createTextEditorDecorationType(this.decorationRenderOptions.get('green') as vscode.DecorationRenderOptions));
        this.decorationTypes.set('red', vscode.window.createTextEditorDecorationType(this.decorationRenderOptions.get('red') as vscode.DecorationRenderOptions));
        this.decorationTypes.set('yellow', vscode.window.createTextEditorDecorationType(this.decorationRenderOptions.get('yellow') as vscode.DecorationRenderOptions));
    }
};