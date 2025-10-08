import * as vscode from 'vscode';

type RangeMap = Map<string, vscode.Range[]>; // filename -> ranges
export type IgnoredEntryType = 'file' | 'folder';
export type IgnoredEntry = {
    uri: string;
    type: IgnoredEntryType;
};

export class State {

    private files: { [key: string]: RangeMap } = {
        ok: new Map(),
        warning: new Map(),
        danger: new Map()
    };
    private fileReviewStatuses: { [key: string]: string } = {}; // filename -> status ('ok', 'warning', 'danger')
    private ignoredEntries: Map<string, IgnoredEntryType> = new Map();

    private parseJsonToRanges(json: any): vscode.Range[] {
        if (!Array.isArray(json)) {
            return [];
        }
        return json
            .filter((range: unknown): range is [number, number] => Array.isArray(range) && range.length === 2)
            .map((range) => new vscode.Range(range[0], 0, range[1], 0));
    }

    private rangeToJson(range: vscode.Range): [number, number] {
        return [range.start.line, range.end.line];
    }

    public loadFromJson(json: any): void {
        // ranges
        for (const key of Object.keys(this.files)) {
            const serialized = json?.[`files_to_${key}`] ?? {};
            this.files[key] = new Map(
                Object.entries(serialized).map(([k, v]) => [k, this.parseJsonToRanges(v)])
            );
        }
        // file review statuses
        this.fileReviewStatuses = json['file_review_statuses'] || {};
        // ignored entries
        this.ignoredEntries.clear();
        const ignored = json['ignored_entries'];
        if (Array.isArray(ignored)) {
            ignored.forEach((entry: IgnoredEntry) => {
                if (entry?.uri && (entry.type === 'file' || entry.type === 'folder')) {
                    this.ignoredEntries.set(entry.uri, entry.type);
                }
            });
        }
    }

    public toJson(): any {
        const obj: any = {};
        for (const key of Object.keys(this.files)) {
            obj[`files_to_${key}`] = Object.fromEntries(Array.from(this.files[key].entries()).map(([k, v]) => [k, v.map(this.rangeToJson)]));
        }
        obj['file_review_statuses'] = this.fileReviewStatuses;
        obj['ignored_entries'] = Array.from(this.ignoredEntries.entries()).map(([uri, type]) => ({ uri, type }));
        return obj;
    }

    public clearAllFiles(): void {
        Object.values(this.files).forEach(map => map.clear());
        this.fileReviewStatuses = {};
    }

    public clearFile(filename: string): void {
        Object.values(this.files).forEach(map => map.delete(filename));
    }

    private removeSpecificRangeFromFile(type: 'ok' | 'warning' | 'danger', filename: string, range: vscode.Range): void {
        const ranges = this.files[type].get(filename);
        if (!ranges) {
            return;
        }

        const newRanges = ranges.reduce((acc: vscode.Range[], current: vscode.Range) => {
            // Check if outside -> we keep the current range
            if (current.start.line > range.end.line || current.end.line < range.start.line) {
                return acc.concat(current);
            }

            // We are intersecting
            // Check if we are inside -> we don't keep the current range
            if (current.start.line >= range.start.line && current.end.line <= range.end.line) {
                return acc;
            }

            // Check if we include the range -> we split into two ranges
            if (current.start.line < range.start.line && current.end.line > range.end.line) {
                const upperRange = new vscode.Range(current.start.line, 0, range.start.line - 1, 0);
                const lowerRange = new vscode.Range(range.end.line + 1, 0, current.end.line, 0);
                return acc.concat(upperRange, lowerRange);
            }

            // We are partially inside
            // Check if we are above -> we keep the current.start and range.start
            if (current.start.line < range.start.line) {
                return acc.concat(new vscode.Range(current.start.line, 0, range.start.line - 1, 0));
            }
            // We are below -> we keep the range.end and current.end
            if (current.end.line > range.end.line) {
                return acc.concat(new vscode.Range(range.end.line + 1, 0, current.end.line, 0));
            }

            // We should never reach this point
            return acc;
        }, []);

        this.files[type].set(filename, newRanges);
    }

    public removeRangeFromAllTypesInFile(filename: string, range: vscode.Range): void {
        Object.keys(this.files).forEach(key => this.removeSpecificRangeFromFile(key as 'ok' | 'warning' | 'danger', filename, range));
    }

    public addRangeToRanges(ranges: vscode.Range[], range: vscode.Range): vscode.Range[] {
        // For now we assume that we don't overwrite on anything
        // Because we delete everything prior to adding
        // But we could consider merging adjacent ranges
        return ranges.concat(range);
    }

    public addRange(type: 'ok' | 'warning' | 'danger', filename: string, range: vscode.Range): void {
        let ranges = this.files[type].get(filename) || [];
        ranges = this.addRangeToRanges(ranges, range);
        this.files[type].set(filename, ranges);
    }

    public getRanges(type: 'ok' | 'warning' | 'danger', filename: string): vscode.Range[] {
        return this.files[type].get(filename) || [];
    }

    public changeFilename(oldFilename: string, newFilename: string): void {
        Object.entries(this.files).forEach(([key, map]) => {
            if (map.has(oldFilename)) {
                const ranges = map.get(oldFilename)!;
                map.delete(oldFilename);
                map.set(newFilename, ranges);
            }
        });
        this.fileReviewStatuses[newFilename] = this.fileReviewStatuses[oldFilename];
        delete this.fileReviewStatuses[oldFilename];

        if (this.ignoredEntries.has(oldFilename)) {
            const type = this.ignoredEntries.get(oldFilename)!;
            this.ignoredEntries.delete(oldFilename);
            this.ignoredEntries.set(newFilename, type);
        }
    }

    // Set the file review status
    public setFileReviewStatus(filename: string, status: 'ok' | 'warning' | 'danger' | 'clear' | 'outOfScope'): void {
        this.fileReviewStatuses[filename] = status;
    }

    // Get the file review status
    public getFileReviewStatus(filename: string): string | undefined {
        return this.fileReviewStatuses[filename];
    }

    // Clear the file review status
    public clearFileReviewStatus(filename: string): void {
        delete this.fileReviewStatuses[filename];
    }

    public getFileReviewStatuses(): { [key: string]: string } {
        return this.fileReviewStatuses;
    }

    public getAllTrackedFileUris(): string[] {
        const uris = new Set<string>();
        Object.values(this.files).forEach(map => {
            map.forEach((_ranges, key) => uris.add(key));
        });
        Object.keys(this.fileReviewStatuses).forEach(key => uris.add(key));
        return Array.from(uris.values());
    }

    public getUnionedRangesForFile(filename: string): vscode.Range[] {
        const collected: vscode.Range[] = [];
        (['ok', 'warning', 'danger'] as const).forEach((key) => {
            const ranges = this.files[key].get(filename);
            if (ranges?.length) {
                collected.push(...ranges);
            }
        });
        return collected;
    }

    public ignoreEntry(uri: string, type: IgnoredEntryType): boolean {
        const existing = this.ignoredEntries.get(uri);
        if (existing === type) {
            return false;
        }
        this.ignoredEntries.set(uri, type);
        return true;
    }

    public unignoreEntry(uri: string): boolean {
        return this.ignoredEntries.delete(uri);
    }

    public getIgnoredEntries(): IgnoredEntry[] {
        return Array.from(this.ignoredEntries.entries()).map(([uri, type]) => ({ uri, type }));
    }

    public getDirectIgnoredType(uri: string): IgnoredEntryType | undefined {
        return this.ignoredEntries.get(uri);
    }

    public isIgnored(filename: string): boolean {
        const targetUri = vscode.Uri.parse(filename);
        for (const [ignoredUri, type] of this.ignoredEntries.entries()) {
            const ignored = vscode.Uri.parse(ignoredUri);
            if (targetUri.toString() === ignored.toString()) {
                return true;
            }
            if (type === 'folder' && targetUri.scheme === ignored.scheme && targetUri.authority === ignored.authority) {
                let ignoredPath = ignored.path;
                if (!ignoredPath.endsWith('/')) {
                    ignoredPath = `${ignoredPath}/`;
                }
                if (targetUri.path.startsWith(ignoredPath)) {
                    return true;
                }
            }
        }
        return false;
    }

    public clearIgnoredEntries(): void {
        this.ignoredEntries.clear();
    }

    public isTracked(uri: string): boolean {
        if (this.fileReviewStatuses[uri] !== undefined) {
            return true;
        }
        for (const map of Object.values(this.files)) {
            if (map.has(uri)) {
                return true;
            }
        }
        return false;
    }

    public ensureTracked(uri: string): boolean {
        if (this.isTracked(uri)) {
            return false;
        }
        this.fileReviewStatuses[uri] = 'clear';
        return true;
    }

    public removeTracked(uri: string): boolean {
        let removed = false;
        if (this.fileReviewStatuses[uri] !== undefined) {
            delete this.fileReviewStatuses[uri];
            removed = true;
        }
        for (const map of Object.values(this.files)) {
            if (map.delete(uri)) {
                removed = true;
            }
        }
        if (this.ignoredEntries.delete(uri)) {
            removed = true;
        }
        return removed;
    }

    public getTrackedUrisUnder(folderUri: string): string[] {
        const targetUri = vscode.Uri.parse(folderUri);
        let targetPath = targetUri.path;
        if (!targetPath.endsWith('/')) {
            targetPath = `${targetPath}/`;
        }
        return this.getAllTrackedFileUris().filter(candidate => {
            const candidateUri = vscode.Uri.parse(candidate);
            return candidateUri.scheme === targetUri.scheme
                && candidateUri.authority === targetUri.authority
                && candidateUri.path.startsWith(targetPath);
        });
    }

    public hasTrackedDescendants(folderUri: string): boolean {
        const targetUri = vscode.Uri.parse(folderUri);
        let targetPath = targetUri.path;
        if (!targetPath.endsWith('/')) {
            targetPath = `${targetPath}/`;
        }
        for (const candidate of this.getAllTrackedFileUris()) {
            const candidateUri = vscode.Uri.parse(candidate);
            if (candidateUri.scheme === targetUri.scheme
                && candidateUri.authority === targetUri.authority
                && candidateUri.path.startsWith(targetPath)) {
                return true;
            }
        }
        return false;
    }

    // Adjust all stored ranges for a file given a change's line delta
    public applyLineDelta(filename: string, changeStartLine: number, changeEndLine: number, lineDelta: number): void {
        if (lineDelta === 0) {
            return;
        }
        const adjustRanges = (ranges: vscode.Range[]): vscode.Range[] => {
            const result: vscode.Range[] = [];
            for (const r of ranges) {
                let rs = r.start.line;
                let re = r.end.line;
                // no overlap and before change
                if (re < changeStartLine) {
                    result.push(r);
                    continue;
                }
                // after change: shift fully
                if (rs > changeEndLine) {
                    const nrs = Math.max(0, rs + lineDelta);
                    const nre = Math.max(0, re + lineDelta);
                    result.push(new vscode.Range(nrs, 0, nre, 0));
                    continue;
                }
                // overlap
                let nrs = rs;
                if (changeStartLine <= rs) {
                    nrs = Math.max(0, rs + lineDelta);
                }
                const nre = Math.max(0, re + lineDelta);
                if (nre >= nrs) {
                    result.push(new vscode.Range(nrs, 0, nre, 0));
                }
                // If inverted (deleted whole range), drop it
            }
            return result;
        };

        (['ok', 'warning', 'danger'] as const).forEach((key) => {
            const map = this.files[key];
            const ranges = map.get(filename);
            if (ranges && ranges.length) {
                map.set(filename, adjustRanges(ranges));
            }
        });
    }

}
