import * as vscode from 'vscode';

type RangeMap = Map<string, vscode.Range[]>; // filename -> ranges

export class State {

    private files: { [key: string]: RangeMap } = {
        ok: new Map(),
        warning: new Map(),
        danger: new Map()
    };

    private parseJsonToRanges(json: any): vscode.Range[] {
        return json.map((range: [number, number]) => new vscode.Range(range[0], 0, range[1], 0));
    }

    private rangeToJson(range: vscode.Range): [number, number] {
        return [range.start.line, range.end.line];
    }

    public loadFromJson(json: any): void {
        for (const key of Object.keys(this.files)) {
            this.files[key] = new Map(Object.entries(json[`files_to_${key}`]).map(([k, v]) => [k, this.parseJsonToRanges(v)]));
        }
    }

    public toJson(): any {
        const obj: any = {};
        for (const key of Object.keys(this.files)) {
            obj[`files_to_${key}`] = Object.fromEntries(Array.from(this.files[key].entries()).map(([k, v]) => [k, v.map(this.rangeToJson)]));
        }
        return obj;
    }

    public clearAllFiles(): void {
        for (const key of Object.keys(this.files)) {
            this.files[key].clear();
        }
    }

    public clearFile(filename: string): void {
        for (const key of Object.keys(this.files)) {
            this.files[key].delete(filename);
        }
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
        for (const key of Object.keys(this.files)) {
            this.removeSpecificRangeFromFile(key as 'ok' | 'warning' | 'danger', filename, range);
        }
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

    public addRange(type: 'ok' | 'warning' | 'danger', filename: string, range: vscode.Range): void {
        let ranges = this.files[type].get(filename) || [];
        ranges = this.addRangeToRanges(ranges, range);
        this.files[type].set(filename, ranges);
    }

    public getRanges(type: 'ok' | 'warning' | 'danger', filename: string): vscode.Range[] {
        return this.files[type].get(filename) || [];
    }

    public changeFilename(oldFilename: string, newFilename: string): void {
        for (const key of Object.keys(this.files)) {
            const ranges = this.files[key as 'ok' | 'warning' | 'danger'].get(oldFilename);
            if (ranges) {
                this.files[key as 'ok' | 'warning' | 'danger'].delete(oldFilename);
                this.files[key as 'ok' | 'warning' | 'danger'].set(newFilename, ranges);
            }
        }
    }
}