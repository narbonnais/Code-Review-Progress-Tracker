import * as vscode from 'vscode';
import { State, IgnoredEntryType } from './state';

type CoverageNodeType = 'workspace' | 'folder' | 'file';

interface CoverageNode {
    readonly id: string;
    readonly type: CoverageNodeType;
    readonly label: string;
    readonly uri?: vscode.Uri;
    readonly status?: string;
    readonly directIgnore: boolean;
    effectiveIgnored: boolean;
    coveredLines: number;
    totalLines: number;
    aggregateCovered: number;
    aggregateTotal: number;
    readonly children: CoverageNode[];
    readonly parent?: CoverageNode;
}

export class CoverageView {
    private readonly provider: CoverageTreeDataProvider;
    private readonly treeView: vscode.TreeView<CoverageTreeItem>;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly state: State
    ) {
        this.provider = new CoverageTreeDataProvider(state, summary => this.updateSummary(summary));
        this.treeView = vscode.window.createTreeView('codeReviewCoverage', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        });
        this.context.subscriptions.push(this.treeView);
    }

    refresh(): void {
        this.provider.refresh();
    }

    getSummary(): CoverageSummary {
        return this.provider.getSummary();
    }

    async ignore(item?: CoverageTreeItem): Promise<void> {
        const target = this.resolveTarget(item);
        if (!target?.node.uri) {
            return;
        }
        const type = target.node.type === 'file' ? 'file' : target.node.type === 'folder' ? 'folder' : undefined;
        if (!type) {
            return;
        }
        this.state.ignoreEntry(target.node.uri.toString(), type);
        await this.persist();
        this.refresh();
    }

    async unignore(item?: CoverageTreeItem): Promise<void> {
        const target = this.resolveTarget(item);
        if (!target?.node.uri) {
            return;
        }
        this.state.unignoreEntry(target.node.uri.toString());
        await this.persist();
        this.refresh();
    }

    async clearIgnores(): Promise<void> {
        this.state.clearIgnoredEntries();
        await this.persist();
        this.refresh();
    }

    private async persist(): Promise<void> {
        await this.context.workspaceState.update('State', this.state.toJson());
    }

    private updateSummary(summary: CoverageSummary): void {
        if (!summary) {
            this.treeView.description = undefined;
            this.treeView.message = undefined;
            return;
        }

        if (summary.totalLines > 0) {
            const percentage = summary.coveredLines === summary.totalLines
                ? '100%'
                : `${(summary.coveredLines / summary.totalLines * 100).toFixed(1)}%`;
            this.treeView.description = `${percentage} (${summary.coveredLines}/${summary.totalLines})`;
        } else {
            this.treeView.description = '—';
        }

        if (summary.trackedFiles === 0) {
            this.treeView.message = 'Mark files or selections to build coverage.';
        } else if (summary.includedFiles === 0) {
            this.treeView.message = 'All tracked entries are currently ignored.';
        } else {
            this.treeView.message = undefined;
        }
    }

    private resolveTarget(item?: CoverageTreeItem): CoverageTreeItem | undefined {
        if (item) {
            return item;
        }
        const selection = this.treeView.selection;
        if (selection && selection.length > 0) {
            return selection[0];
        }
        return undefined;
    }
}

interface FileCoverageInfo {
    uri: vscode.Uri;
    workspace: vscode.WorkspaceFolder;
    coveredLines: number;
    totalLines: number;
    status?: string;
    directIgnore: boolean;
    effectiveIgnored: boolean;
}

export interface CoverageSummary {
    coveredLines: number;
    totalLines: number;
    trackedFiles: number;
    includedFiles: number;
    ignoredEntries: number;
}

export class CoverageTreeItem extends vscode.TreeItem {
    constructor(public readonly node: CoverageNode) {
        const collapsibleState = node.type === 'file'
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Collapsed;
        super(node.label, collapsibleState);

        this.description = CoverageTreeItem.buildDescription(node);
        this.tooltip = CoverageTreeItem.buildTooltip(node);
        if (node.uri) {
            this.resourceUri = node.uri;
        }
        const baseContext = CoverageTreeItem.getBaseContext(node);
        if (node.directIgnore) {
            this.contextValue = `${baseContext}Ignored`;
        } else if (node.effectiveIgnored) {
            this.contextValue = `${baseContext}Excluded`;
        } else {
            this.contextValue = baseContext;
        }
    }

    private static buildDescription(node: CoverageNode): string | undefined {
        const parts: string[] = [];
        if (node.totalLines > 0) {
            const percentage = node.coveredLines === node.totalLines
                ? '100%'
                : `${(node.coveredLines / node.totalLines * 100).toFixed(1)}%`;
            parts.push(`${percentage} (${node.coveredLines}/${node.totalLines})`);
        } else {
            parts.push('—');
        }

        if (node.directIgnore) {
            parts.push('ignored');
        } else if (node.effectiveIgnored) {
            parts.push('excluded');
        }

        return parts.join(' · ');
    }

    private static buildTooltip(node: CoverageNode): vscode.MarkdownString {
        const md = new vscode.MarkdownString(undefined, true);
        const lines = [
            `**Coverage**: ${node.totalLines > 0 ? `${node.coveredLines} / ${node.totalLines} lines` : 'No line data'}`
        ];
        if (node.status) {
            lines.push(`**Status**: ${node.status}`);
        }
        if (node.directIgnore) {
            lines.push('**Ignored**: This entry is excluded from totals.');
        } else if (node.effectiveIgnored) {
            lines.push('**Ignored**: Inherited from parent.');
        }
        md.appendMarkdown(lines.join('\n\n'));
        md.isTrusted = true;
        return md;
    }

    private static getBaseContext(node: CoverageNode): string {
        switch (node.type) {
            case 'file':
                return 'coverageFile';
            case 'folder':
                return 'coverageFolder';
            case 'workspace':
            default:
                return 'coverageWorkspace';
        }
    }
}

export class CoverageTreeDataProvider implements vscode.TreeDataProvider<CoverageTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<CoverageTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private rootNodes: CoverageNode[] = [];
    private summary: CoverageSummary = {
        coveredLines: 0,
        totalLines: 0,
        trackedFiles: 0,
        includedFiles: 0,
        ignoredEntries: 0
    };
    private buildPromise: Promise<void> | undefined;

    constructor(
        private readonly state: State,
        private readonly onSummaryChange?: (summary: CoverageSummary) => void
    ) {}

    refresh(): void {
        this.buildPromise = undefined;
        this.rootNodes = [];
        this._onDidChangeTreeData.fire(undefined);
    }

    async getTreeItem(element: CoverageTreeItem): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: CoverageTreeItem): Promise<CoverageTreeItem[]> {
        await this.ensureModel();
        if (!element) {
            return this.rootNodes.map(node => new CoverageTreeItem(node));
        }
        return element.node.children.map(child => new CoverageTreeItem(child));
    }

    getParent?(element: CoverageTreeItem): vscode.ProviderResult<CoverageTreeItem> {
        const parent = element.node.parent;
        if (!parent) {
            return undefined;
        }
        return new CoverageTreeItem(parent);
    }

    getSummary(): CoverageSummary {
        return this.summary;
    }

    private async ensureModel(): Promise<void> {
        if (!this.buildPromise) {
            this.buildPromise = this.buildModel().finally(() => {
                this.buildPromise = undefined;
            });
        }
        await this.buildPromise;
    }

    private async buildModel(): Promise<void> {
        const trackedUris = this.state.getAllTrackedFileUris();
        const ignoredEntries = new Map<string, IgnoredEntryType>(
            this.state.getIgnoredEntries().map(entry => [entry.uri, entry.type])
        );

        const fileInfos = await this.collectFileInfos(trackedUris, ignoredEntries);
        const nodes = this.buildTree(fileInfos, ignoredEntries);
        const summary = this.computeSummary(nodes, ignoredEntries.size);

        this.rootNodes = nodes;
        this.summary = summary;
        if (this.onSummaryChange) {
            this.onSummaryChange(summary);
        }
    }

    private async collectFileInfos(
        trackedUris: string[],
        ignoredEntries: Map<string, IgnoredEntryType>
    ): Promise<FileCoverageInfo[]> {
        const results = await Promise.all(trackedUris.map(async uriString => {
            const uri = vscode.Uri.parse(uriString);
            const workspace = vscode.workspace.getWorkspaceFolder(uri);
            if (!workspace) {
                return undefined;
            }
            const status = this.state.getFileReviewStatus(uriString);
            const ranges = this.state.getUnionedRangesForFile(uriString);
            const directIgnore = ignoredEntries.has(uri.toString());
            const effectiveIgnored = this.state.isIgnored(uri.toString());

            let totalLines = 0;
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                totalLines = doc.lineCount;
            } catch {
                totalLines = 0;
            }

            let coveredLines = this.countCoveredLines(ranges);
            if (status && ['ok', 'warning', 'danger'].includes(status)) {
                coveredLines = totalLines;
            }
            if (totalLines > 0) {
                coveredLines = Math.min(coveredLines, totalLines);
            } else if (coveredLines > 0) {
                totalLines = coveredLines;
            }

            return {
                uri,
                workspace,
                coveredLines,
                totalLines,
                status,
                directIgnore,
                effectiveIgnored,
            } as FileCoverageInfo;
        }));

        return results.filter((info): info is FileCoverageInfo => info !== undefined);
    }

    private buildTree(
        fileInfos: FileCoverageInfo[],
        ignoredEntries: Map<string, IgnoredEntryType>
    ): CoverageNode[] {
        const rootsByWorkspace = new Map<string, CoverageNode>();

        const ensureNode = (
            parent: CoverageNode,
            segment: string,
            uri: vscode.Uri | undefined,
            type: CoverageNodeType
        ): CoverageNode => {
            let child = parent.children.find(node => node.label === segment);
            if (!child) {
                const directIgnore = uri ? ignoredEntries.has(uri.toString()) : false;
                child = {
                    id: uri ? uri.toString() : `${parent.id}/${segment}`,
                    label: segment,
                    type,
                    uri,
                    status: undefined,
                    directIgnore,
                    effectiveIgnored: Boolean(parent.effectiveIgnored || directIgnore),
                    coveredLines: 0,
                    totalLines: 0,
                    aggregateCovered: 0,
                    aggregateTotal: 0,
                    children: [],
                    parent
                };
                parent.children.push(child);
            }
            return child;
        };

        for (const info of fileInfos) {
            const workspaceUri = info.workspace.uri;
            let root = rootsByWorkspace.get(workspaceUri.toString());
            if (!root) {
                root = {
                    id: workspaceUri.toString(),
                    label: info.workspace.name,
                    type: 'workspace',
                    uri: workspaceUri,
                    status: undefined,
                    directIgnore: ignoredEntries.has(workspaceUri.toString()),
                    effectiveIgnored: false,
                    coveredLines: 0,
                    totalLines: 0,
                    aggregateCovered: 0,
                    aggregateTotal: 0,
                    children: [],
                    parent: undefined
                };
                rootsByWorkspace.set(workspaceUri.toString(), root);
            }

            const relativePath = info.uri.path.slice(workspaceUri.path.length).replace(/^\//, '');
            const segments = relativePath.split('/').filter(Boolean);
            let current = root;
            let currentPath = workspaceUri.path;
            for (let i = 0; i < segments.length - 1; i++) {
                currentPath = `${currentPath}/${segments[i]}`;
                const folderUri = workspaceUri.with({ path: currentPath });
                current = ensureNode(current, segments[i], folderUri, 'folder');
            }
            const fileName = segments[segments.length - 1];
            const fileNode: CoverageNode = {
                id: info.uri.toString(),
                label: fileName,
                type: 'file',
                uri: info.uri,
                status: info.status,
                directIgnore: info.directIgnore,
                effectiveIgnored: info.effectiveIgnored,
                coveredLines: info.coveredLines,
                totalLines: info.totalLines,
                aggregateCovered: 0,
                aggregateTotal: 0,
                children: [],
                parent: current
            };
            current.children.push(fileNode);
        }

        const roots = Array.from(rootsByWorkspace.values());
        roots.forEach(root => this.finaliseNode(root, root.parent?.effectiveIgnored || false));
        return roots;
    }

    private finaliseNode(node: CoverageNode, parentIgnored: boolean): void {
        node.effectiveIgnored = Boolean(parentIgnored || node.directIgnore);
        if (node.type === 'file') {
            if (node.effectiveIgnored) {
                node.aggregateCovered = 0;
                node.aggregateTotal = 0;
            } else {
                node.aggregateCovered = node.coveredLines;
                node.aggregateTotal = node.totalLines;
            }
            return;
        }

        let covered = 0;
        let total = 0;
        for (const child of node.children) {
            this.finaliseNode(child, node.effectiveIgnored);
            covered += child.aggregateCovered;
            total += child.aggregateTotal;
        }
        node.coveredLines = covered;
        node.totalLines = total;
        if (node.effectiveIgnored) {
            node.aggregateCovered = 0;
            node.aggregateTotal = 0;
        } else {
            node.aggregateCovered = covered;
            node.aggregateTotal = total;
        }
    }

    private computeSummary(nodes: CoverageNode[], ignoredCount: number): CoverageSummary {
        let covered = 0;
        let total = 0;
        let trackedFiles = 0;
        let includedFiles = 0;

        const collect = (node: CoverageNode) => {
            if (node.type === 'file') {
                trackedFiles += 1;
                if (!node.effectiveIgnored) {
                    includedFiles += 1;
                    covered += node.coveredLines;
                    total += node.totalLines;
                }
                return;
            }
            node.children.forEach(collect);
        };

        nodes.forEach(collect);

        return {
            coveredLines: covered,
            totalLines: total,
            trackedFiles,
            includedFiles,
            ignoredEntries: ignoredCount
        };
    }

    private countCoveredLines(ranges: vscode.Range[]): number {
        const coveredLines = new Set<number>();
        for (const range of ranges) {
            const start = Math.max(0, range.start.line);
            const end = Math.max(start, range.end.line);
            for (let line = start; line <= end; line++) {
                coveredLines.add(line);
            }
        }
        return coveredLines.size;
    }
}
