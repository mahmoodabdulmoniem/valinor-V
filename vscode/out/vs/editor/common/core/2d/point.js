/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Point {
    static equals(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }
    deltaX(delta) {
        return new Point(this.x + delta, this.y);
    }
    deltaY(delta) {
        return new Point(this.x, this.y + delta);
    }
    toString() {
        return `(${this.x},${this.y})`;
    }
    subtract(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }
    scale(factor) {
        return new Point(this.x * factor, this.y * factor);
    }
    mapComponents(map) {
        return new Point(map(this.x), map(this.y));
    }
    isZero() {
        return this.x === 0 && this.y === 0;
    }
    withThreshold(threshold) {
        return this.mapComponents(axisVal => {
            if (axisVal > threshold) {
                return axisVal - threshold;
            }
            else if (axisVal < -threshold) {
                return axisVal + threshold;
            }
            return 0;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS8yZC9wb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sS0FBSztJQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQVEsRUFBRSxDQUFRO1FBQy9CLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsWUFDaUIsQ0FBUyxFQUNULENBQVM7UUFEVCxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQ1QsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUN0QixDQUFDO0lBRUUsR0FBRyxDQUFDLEtBQVk7UUFDdEIsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBYTtRQUMxQixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUNoQyxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVk7UUFDM0IsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxNQUFjO1FBQzFCLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU0sYUFBYSxDQUFDLEdBQThCO1FBQ2xELE9BQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxhQUFhLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ25DLElBQUksT0FBTyxHQUFHLFNBQVMsRUFBRSxDQUFDO2dCQUN6QixPQUFPLE9BQU8sR0FBRyxTQUFTLENBQUM7WUFDNUIsQ0FBQztpQkFBTSxJQUFJLE9BQU8sR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLE9BQU8sR0FBRyxTQUFTLENBQUM7WUFDNUIsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==