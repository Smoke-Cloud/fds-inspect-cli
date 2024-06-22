import * as fdsInspectCore from "jsr:@smoke-cloud/fds-inspect-core@0.1.11";
import Chart, {
    type ChartConfiguration,
    type ChartData,
    type DefaultDataPoint,
    type Point,
} from "npm:chart.js@4.4.3/auto";
import annotationPlugin from "npm:chartjs-plugin-annotation@3.0.1";

// import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts";
import { createCanvas } from "jsr:@gfx/canvas@0.5.6";
import * as path from "jsr:@std/path@0.225.2";

Chart.register(annotationPlugin);

export function createStdHRRCurves(
    dv: fdsInspectCore.smv.DataVector,
    offset: number,
) {
    if (offset == undefined) offset = 0;
    let maxHRR = 0;
    for (const p of dv.values) {
        maxHRR = Math.max(maxHRR, p.y);
    }
    if (maxHRR === 0) maxHRR = 1;
    const slowDV: fdsInspectCore.smv.DataVector = {
        name: "Slow HRR",
        x: { name: "Time", units: "s" },
        y: { name: "Slow HRR", units: "kW" },
        values: [],
    };
    const mediumDV: fdsInspectCore.smv.DataVector = {
        name: "Medium HRR",
        x: { name: "Time", units: "s" },
        y: { name: "Medium HRR", units: "kW" },
        values: [],
    };
    const fastDV: fdsInspectCore.smv.DataVector = {
        name: "Fast HRR",
        x: { name: "Time", units: "s" },
        y: { name: "Fast HRR", units: "kW" },
        values: [],
    };
    const ultrafastDV: fdsInspectCore.smv.DataVector = {
        name: "Ultrafast HRR",
        x: { name: "Time", units: "s" },
        y: { name: "Ultrafast HRR", units: "kW" },
        values: [],
    };
    const bound = 1.5;
    for (const p of dv.values) {
        const slowVal = fdsInspectCore.fds.calcHrrAlpha(
            fdsInspectCore.fds.alpha(
                fdsInspectCore.fds.StdGrowthRate.EurocodeSlow,
            ),
            p.x - offset,
        );
        const mediumVal = fdsInspectCore.fds.calcHrrAlpha(
            fdsInspectCore.fds.alpha(
                fdsInspectCore.fds.StdGrowthRate.EurocodeMedium,
            ),
            p.x - offset,
        );
        const fastVal = fdsInspectCore.fds.calcHrrAlpha(
            fdsInspectCore.fds.alpha(
                fdsInspectCore.fds.StdGrowthRate.EurocodeFast,
            ),
            p.x - offset,
        );
        const ultrafastVal = fdsInspectCore.fds.calcHrrAlpha(
            fdsInspectCore.fds.alpha(
                fdsInspectCore.fds.StdGrowthRate.EurocodeUltrafast,
            ),
            p.x - offset,
        );
        if (slowVal < (bound * maxHRR)) {
            slowDV.values.push({ x: p.x, y: slowVal });
        }
        if (mediumVal < (bound * maxHRR)) {
            mediumDV.values.push({ x: p.x, y: mediumVal });
        }
        if (fastVal < (bound * maxHRR)) {
            fastDV.values.push({ x: p.x, y: fastVal });
        }
        if (ultrafastVal < (bound * maxHRR)) {
            ultrafastDV.values.push({ x: p.x, y: ultrafastVal });
        }
    }
    // slowDV.with = string.format('lines dashtype 2 lt rgb "%s"', slowColour);
    // mediumDV.with = string.format('lines dashtype 2 lt rgb "%s"', mediumColour);
    // fastDV.with = string.format('lines dashtype 2 lt rgb "%s"', fastColour);
    // ultrafastDV.with = string.format(
    //     'lines dashtype 2 lt rgb "%s"',
    //     ultrafastColour,
    // );
    return { slowDV, mediumDV, fastDV, ultrafastDV };
}

export type ChartExtra = ChartRange | ChartBand;
export interface ChartRange {
    type: "chart-range";
    axis: "x" | "y";
    start: number;
    end: number;
    label: string;
}
export interface ChartBand {
    type: "chart-band";
    dvA: fdsInspectCore.smv.DataVector;
    dvB: fdsInspectCore.smv.DataVector;
    label: string;
}

export async function plotDv(
    plotPath: string,
    dvs: (fdsInspectCore.smv.DataVector & {
        color?: string;
        dash?: number[];
    })[],
    title: string,
    _plotConfig?: {},
    extras?: {
        sprinklerTime?: number;
        detectorTime?: number;
        chartExtras?: ChartExtra[];
    },
) {
    await Deno.mkdir(path.dirname(plotPath), { recursive: true });
    const dv = dvs[0];
    const data: ChartData<"line", (number | Point | null)[], unknown> = {
        datasets: dvs.map((dv) => ({
            label: dv.name ?? dv.y.name,
            data: dv.values,
            // backgroundColor: "rgb(255, 99, 132)",
            borderColor: dv.color,
            borderDash: dv.dash,
        })),
    };
    for (const extra of extras?.chartExtras ?? []) {
        // if (extra.type === "chart-range") {
        //     console.log("adding chart range");
        //     data.datasets.push({
        //         label: extra.label,
        //         // data: dv.values,
        //         // backgroundColor: "rgb(255, 99, 132)",
        //         // borderColor: dv.color,
        //         // borderDash: dv.dash,
        //         // fill: {
        //         //     target: "origin",
        //         //     above: "rgb(255, 0, 0)", // Area will be red above the origin
        //         //     below: "rgb(0, 0, 255)", // And blue below the origin
        //         // },
        //         fill: { value: 25 },
        //     });
        // } else
        if (extra.type === "chart-band") {
            data.datasets.push({
                label: extra.label,
                data: extra.dvA.values,
                borderColor: undefined,
                borderDash: undefined,
            });
            data.datasets.push({
                label: extra.label,
                data: extra.dvB.values,
                // backgroundColor: "rgb(255, 99, 132)",
                // borderColor: dv.color,
                // borderDash: dv.dash,
                fill: "-1",
            });
        }
    }
    // data.datasets.push({
    //     label: "test",
    //     data: dv.values,
    //     // backgroundColor: "rgb(255, 99, 132)",
    //     // borderColor: dv.color,
    //     // borderDash: dv.dash,
    //     fill: {
    //         target: "origin",
    //         above: "rgb(255, 0, 255)", // Area will be red above the origin
    //         below: "rgb(0, 0, 255)", // And blue below the origin
    //     },
    // });
    const config: ChartConfiguration<
        "line",
        DefaultDataPoint<"line">,
        unknown
    > = {
        type: "line",
        data,
        options: {
            font: {
                size: 32,
            },
            elements: {
                point: { pointStyle: false },
                line: {
                    "fill": false,
                    // "borderDash": [5, 5],
                },
            },
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    ticks: {
                        font: {
                            size: 24,
                        },
                    },
                    title: {
                        display: true,
                        text: `${dv.x.name} (${dv.x.units})`,
                        font: { size: 32 },
                    },
                },
                y: {
                    type: "linear",
                    ticks: {
                        font: {
                            size: 24,
                        },
                    },
                    title: {
                        display: true,
                        text: `${dv.y.name} (${dv.y.units})`,
                        font: { size: 32 },
                    },
                },
            },
            plugins: {
                filler: {
                    propagate: true,
                },
                title: {
                    display: true,
                    text: title,
                    font: { size: 48 },
                },
                legend: {
                    display: true,
                    labels: {
                        // color: "rgb(255, 99, 132)",
                        "usePointStyle": false,
                        boxHeight: 0,
                        font: { size: 24 },
                    },
                    position: "bottom",
                },
                // annotation: {
                //     annotations: {
                //         line1: {
                //             type: "line",
                //             yMin: 60,
                //             yMax: 60,
                //             borderColor: "rgb(255, 99, 132)",
                //             borderWidth: 2,
                //             // mode: "vertical",
                //             // scaleID: "x-axis-0",
                //             // value: 25,
                //             // borderColor: "red",
                //             // label: {
                //             //     content: "TODAY",
                //             //     enabled: true,
                //             //     position: "top",
                //             // },
                //         },
                //     },
                // },
            },
        },
    };
    const canvas = createCanvas(1600, 1000);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1600, 1000);
    new Chart(
        ctx,
        config,
    );
    canvas.save(plotPath);
}

const unitMap = new Map();
unitMap.set("m3/s", "m³/s");

export function plotHRRDV(
    plotPath: string,
    hrrDV: fdsInspectCore.smv.DataVector,
    name: string,
    config?: { offset?: number },
    spec?: {
        hrrSpec?: fdsInspectCore.fds.HrrSpecSimple;
        bound?: number;
        door?: { open: number; close: number };
        sprinklerTime?: number;
        detectorTime?: number;
    },
) {
    const offset = config?.offset ?? 0;
    let maxHRR = 0;
    const { slowDV, mediumDV, fastDV, ultrafastDV } = createStdHRRCurves(
        hrrDV,
        offset,
    );

    const vecs: (fdsInspectCore.smv.DataVector & {
        color?: string;
        dash?: number[];
    })[] = [
        { color: "#008000", dash: [10, 5], ...slowDV },
        { color: "#FF0000", dash: [10, 5], ...mediumDV },
        { color: "#00BFBF", dash: [10, 5], ...fastDV },
        { color: "#BF00BF", dash: [10, 5], ...ultrafastDV },
        { color: "#222222", ...hrrDV },
    ];
    for (const p of hrrDV.values) {
        maxHRR = Math.max(maxHRR, p.y);
    }
    // if (hrrDV.x && hrrDV.y) {
    // }else{
    //     // TODO: find the best set of x points from each HRR DV, instead of using
    //     // hrrDV[1]
    //     for (const p of hrrDV[0].values) {
    //         maxHRR = Math.max(maxHRR,p.y);
    //     }
    //     const {slowDV, mediumDV, fastDV, ultrafastDV} = createStdHRRCurves(hrrDV[0], offset)
    //     // hrrDV.opts = { "lt 1" }
    //     vecs = [hrrDV]
    //     for (const v  of [ slowDV, mediumDV, fastDV, ultrafastDV ]) {
    //         vecs.push(v);
    //     }
    // }
    if (maxHRR == 0) maxHRR = 1;
    const extras: {
        maxTargetHrr?: number;
        lowerBound?: number;
        upperBound?: number;
        door?: { open: number; close: number };
        sprinklerTime?: number;
        detectorTime?: number;
        chartExtras: ChartExtra[];
    } = {
        maxTargetHrr: maxHRR,
        chartExtras: [],
    };
    {
        const filteredVec = structuredClone(hrrDV);
        // wma(filteredVec, 20);
        filteredVec.name = "Time-Averaged (WMA)";
        // filteredVec.opts = { "lt 2" };
        vecs.push(filteredVec);
    }
    // if (spec?.hrrSpec) {
    //     const configObject = type(plotConfig.bounds) == "table";
    //     let alpha;
    //     if (configObject && plotConfig.bounds.alpha) {
    //         if (type(plotConfig.bounds.growthRate) == "string") {
    //             alpha = growthRates[plotConfig.bounds.growthRate];
    //         } else {
    //             alpha = plotConfig.bounds.growthRate;
    //         }
    //     } else {
    //         alpha = mediumAlpha;
    //     }
    //     let capTime;
    //     if (configObject && plotConfig.bounds.capTime) {
    //         capTime = plotConfig.bounds.capTime;
    //     } else {
    //         capTime = 300;
    //     }
    //     let bound;
    //     if (configObject && plotConfig.bounds.bound) {
    //         bound = plotConfig.bounds.bound;
    //     } else {
    //         bound = 0.1;
    //     }
    //     {
    //         if (configObject && plotConfig.bounds.fixed) {
    //             const lowerBound = smv.deepCopy(hrrDV);
    //             for (i, x in ipairs(lowerBound.x.values)) {
    //                 lowerBound.y.values[i] = plotConfig.bounds.fixed *
    //                     (1 + bound);
    //             }
    //             lowerBound.name = "Lower Bound";
    //             extras.lowerBound = lowerBound;
    //         } else {
    //             const lowerBound = smv.deepCopy(hrrDV);
    //             for (i, x in ipairs(lowerBound.x.values)) {
    //                 lowerBound.y.values[i] = cappedCurve(alpha, capTime, x) *
    //                     (1 + bound);
    //             }
    //             lowerBound.name = "Lower Bound";
    //             extras.lowerBound = lowerBound;
    //         }
    //     }
    //     {
    //         if (configObject && plotConfig.bounds.fixed) {
    //             const upperBound = structuredClone(hrrDV);
    //             for (i, x in ipairs(upperBound.x.values)) {
    //                 upperBound.y.values[i] = plotConfig.bounds.fixed *
    //                     (1 - bound);
    //             }
    //             upperBound.name = "Upper Bound";
    //             extras.upperBound = upperBound;
    //         } else {
    //             const upperBound = structuredClone(hrrDV);
    //             for (i, x in ipairs(upperBound.x.values)) {
    //                 upperBound.y.values[i] = cappedCurve(alpha, capTime, x) *
    //                     (1 - bound);
    //             }
    //             upperBound.name = "Upper Bound";
    //             extras.upperBound = upperBound;
    //         }
    //     }
    // }
    if (spec?.door) {
        extras.chartExtras.push({
            type: "chart-range",
            axis: "x",
            start: spec.door.open,
            end: spec.door.open,
            label: "Door Open",
        });
    }
    if (spec?.hrrSpec) {
        extras.chartExtras.push({
            type: "chart-band",
            dvA: fdsInspectCore.fds.generateHrr(spec?.hrrSpec, hrrDV, 0.9),
            dvB: fdsInspectCore.fds.generateHrr(spec?.hrrSpec, hrrDV, 1.1),
            label: "10% Bounds",
        });
    }
    extras.door = spec?.door;
    extras.sprinklerTime = spec?.sprinklerTime;
    extras.detectorTime = spec?.detectorTime;
    return plotDv(plotPath, vecs, name, {}, extras);
}

// Weighted moving average
function _wma(dv: fdsInspectCore.smv.DataVector, window: number) {
    if (dv.values.length <= 1) {
        // The weighted average of an empty vector or a vector that has a
        // single element is just the same vector
        throw new Error("cannot average empty vector");
    }
    for (const [i, p] of dv.values.entries()) {
        // The total sum
        let sum = 0;
        // First the actual value is fully weighted
        sum = sum + p.y * window;
        let totalWeight = window;
        for (let j = 1; j < window; j++) {
            const weight = window - j;
            let valueBehind = dv.values[i - j].y;
            if (valueBehind == undefined) {
                // If the window covers an area "before" before the start of the
                // vector, just use the first value. We know this exists as th
                // vector is not empty.
                valueBehind = dv.values[1].y;
            }
            let valueAhead = dv.values[i + j].y;
            if (valueAhead == undefined) {
                // If the window covers an area "after" before the end of the
                // vector, just use the last value. We know this exists as th
                // vector is not empty.
                valueAhead = dv.values[dv.values.length - 1].y;
            }
            sum = sum + valueBehind * weight;
            sum = sum + valueAhead * weight;
            totalWeight = totalWeight + weight * 2;
        }
        dv.values[i].y = sum / totalWeight;
    }
    return dv;
}
