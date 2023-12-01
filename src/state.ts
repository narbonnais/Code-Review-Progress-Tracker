import * as vscode from 'vscode';

export class State {
    // Will keep track of every lines that have been reviewed
    // Files is a map of strings to a list of ranges
    public files_to_ok: Map<string, vscode.Range[]> = new Map();
    public files_to_warning: Map<string, vscode.Range[]> = new Map();
    public files_to_danger: Map<string, vscode.Range[]> = new Map();

    private parseJsonToRanges(json: any): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        for (const range of json) {
            ranges.push(new vscode.Range(range[0], range[1]));
        }
        return ranges;
    }

    public loadFromJson(json: any): void {
        this.files_to_ok = new Map(Object.entries(json.files_to_ok).map(([k, v]) => [k, this.parseJsonToRanges(v)]));
        this.files_to_warning = new Map(Object.entries(json.files_to_warning).map(([k, v]) => [k, this.parseJsonToRanges(v)]));
        this.files_to_danger = new Map(Object.entries(json.files_to_danger).map(([k, v]) => [k, this.parseJsonToRanges(v)]));
    }

    public toJson(): any {
        const obj = {
            files_to_ok: Object.fromEntries(this.files_to_ok),
            files_to_warning: Object.fromEntries(this.files_to_warning),
            files_to_danger: Object.fromEntries(this.files_to_danger),
        };
        return obj;
    }

    public clear(): void {
        this.files_to_ok.clear();
        this.files_to_warning.clear();
        this.files_to_danger.clear();
    }

    public clearFile(filename: string): void {
        this.files_to_ok.delete(filename);
        this.files_to_warning.delete(filename);
        this.files_to_danger.delete(filename);
    }

    public tryMergeRanges(current: vscode.Range, against: vscode.Range): vscode.Range | undefined {
        // Truncate the current range to the against range

        // If current is inside against, return against
        if (current.start.line >= against.start.line && current.end.line <= against.end.line) {
            return against;
        }

        // If against is inside current, return current
        if (against.start.line >= current.start.line && against.end.line <= current.end.line) {
            return current;
        }

        // If current is before against, return undefined
        if (current.end.line < against.start.line) {
            return undefined;
        }
        
        // If current is after against, return undefined
        if (current.start.line > against.end.line) {
            return undefined;
        }

        // If current is partially inside against, return the lower and upper bounds
        let start_line = Math.min(current.start.line, against.start.line);
        let end_line = Math.max(current.end.line, against.end.line);

        return new vscode.Range(start_line, 0, end_line, 0);
    }

    public addRangeToRanges(ranges: vscode.Range[], range: vscode.Range): vscode.Range[] {
        if (ranges.length === 0) {
            return [range];
        }
        
        let wasMerged = false;
        for (let i = 0; i < ranges.length; ++i) {
            const current = ranges[i];
            const merged = this.tryMergeRanges(current, range);
            if (merged) {
                ranges[i] = merged;
                wasMerged = true;
            }
        }

        if (!wasMerged) {
            ranges.push(range);
        }

        return ranges;
    }

    public addOk(filename: string, range: vscode.Range): void {
        let ranges: vscode.Range[] | undefined = this.files_to_ok.get(filename);
        if (!ranges) {
            ranges = [] as vscode.Range[];
        }

        ranges = this.addRangeToRanges(ranges, range);

        this.files_to_ok.set(filename, ranges);
    }

    public addWarning(filename: string, range: vscode.Range): void {
        let ranges = this.files_to_warning.get(filename);
        if (!ranges) {
            ranges = [];
        }

        ranges = this.addRangeToRanges(ranges, range);

        this.files_to_warning.set(filename, ranges);
    }

    public tryMergeDeleteRanges(current: vscode.Range, against: vscode.Range): vscode.Range[] | undefined {
        // Truncate the current range to the against range

        // If current is inside against, delete the current range
        if (current.start.line >= against.start.line && current.end.line <= against.end.line) {
            return [];
        }

        // If against is inside current, return two ranges surrounding against
        if (against.start.line >= current.start.line && against.end.line <= current.end.line) {
            return [new vscode.Range(current.start.line, 0, against.start.line - 1, 0), new vscode.Range(against.end.line + 1, 0, current.end.line, 0)];
        }

        // If current is before against, return undefined
        if (current.end.line < against.start.line) {
            return undefined;
        }
        
        // If current is after against, return undefined
        if (current.start.line > against.end.line) {
            return undefined;
        }

        // If current is above and partially inside against, return the lower bound
        if (current.start.line <= against.start.line) {
            return [new vscode.Range(current.start.line, 0, against.start.line - 1, 0)];
        }

        // If current is below and partially inside against, return the upper bound
        if (current.end.line >= against.end.line) {
            return [new vscode.Range(against.end.line + 1, 0, current.end.line, 0)];
        }

        return undefined;
    }

    public deleteOk(filename: string, range: vscode.Range): void {
        let ranges = this.files_to_ok.get(filename);
        if (!ranges) {
            ranges = [];
        }

        // For each range, try to merge it with the range to delete
        // If it merges, replace the range with the merged range
        // If it deletes, remove the range
        // If it does nothing, keep the range
        const new_ranges: vscode.Range[] = [];
        for (const current of ranges) {
            const merged = this.tryMergeDeleteRanges(current, range);
            if (merged) {
                new_ranges.push(...merged);
            } else {
                new_ranges.push(current);
            }
        }

        this.files_to_ok.set(filename, new_ranges);
    }

    public deleteWarning(filename: string, range: vscode.Range): void {
        let ranges = this.files_to_warning.get(filename);
        if (!ranges) {
            ranges = [];
        }

        // For each range, try to merge it with the range to delete
        // If it merges, replace the range with the merged range
        // If it deletes, remove the range
        // If it does nothing, keep the range
        const new_ranges: vscode.Range[] = [];
        for (const current of ranges) {
            const merged = this.tryMergeDeleteRanges(current, range);
            if (merged) {
                new_ranges.push(...merged);
            } else {
                new_ranges.push(current);
            }
        }

        this.files_to_warning.set(filename, new_ranges);
    }

    public deleteDanger(filename: string, range: vscode.Range): void {
        let ranges = this.files_to_danger.get(filename);
        if (!ranges) {
            ranges = [];
        }

        // For each range, try to merge it with the range to delete
        // If it merges, replace the range with the merged range
        // If it deletes, remove the range
        // If it does nothing, keep the range
        const new_ranges: vscode.Range[] = [];
        for (const current of ranges) {
            const merged = this.tryMergeDeleteRanges(current, range);
            if (merged) {
                new_ranges.push(...merged);
            } else {
                new_ranges.push(current);
            }
        }

        this.files_to_danger.set(filename, new_ranges);
    }

    public addDanger(filename: string, range: vscode.Range): void {
        let ranges = this.files_to_danger.get(filename);
        if (!ranges) {
            ranges = [];
        }

        ranges = this.addRangeToRanges(ranges, range);

        this.files_to_danger.set(filename, ranges);
    }

    public getOk(filename: string): vscode.Range[] {
        return this.files_to_ok.get(filename) || [];
    }

    public getWarning(filename: string): vscode.Range[] {
        return this.files_to_warning.get(filename) || [];
    }

    public getDanger(filename: string): vscode.Range[] {
        return this.files_to_danger.get(filename) || [];
    }
}