import * as fdsInspectCore from "@smoke-cloud/fds-inspect-core";
import * as fdsInspect from "@smoke-cloud/fds-inspect";
import { Command } from "@cliffy/command";
import { open } from "./open.ts";
import * as path from "@std/path";
import "./plot.ts";
import { plotHRRDV } from "./plot.ts";

await new Command()
  .name("fds-inspect")
  .description("Commands for inpsecting an FDS input file.")
  .version("v0.1.16")
  .action(function () {
    this.showHelp();
  })
  .command("count-cells", "Count the total number of cells")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsData = await getJsonTemp(args[0]);
    // const nCells = fdsInspect.summary.countCells(fdsData);
    // console.log(nCells);
  })
  // Get Threadway Send
  .command("meshes", "Display information on each mesh")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
    // // use fute_core::FdsFileExt;
    // use prettytable::{Attr, Cell, Row, Table};
    // // use fute_core::FdsFile;
    // // use fute_core::parse_and_decode_fds_input_file;
    // use num_format::{Locale, ToFormattedString};

    // let fds_file = parse_and_decode_fds_input_file(fds_path).unwrap();
    // let meshes = fds_file.mesh;
    // let mut table = Table::new();
    // table.set_titles(Row::new(vec![
    //     Cell::new("#").with_style(Attr::Bold),
    //     Cell::new("Mesh Id.").with_style(Attr::Bold),
    //     Cell::new("# Cells").with_style(Attr::Bold),
    //     Cell::new("I-J-K").with_style(Attr::Bold),
    //     Cell::new("Δx-Δy-Δz").with_style(Attr::Bold),
    //     Cell::new("Aspect Ratio").with_style(Attr::Bold),
    // ]));
    // let mut n_cells_total: u64 = 0;
    // for (i, mesh) in meshes.iter().enumerate() {
    //     let xb = mesh.xb;
    //     let ijk = mesh.ijk;
    //     let n_cell = Cell::new(&format!("{}", i + 1));
    //     let id_cell = Cell::new(mesh.id.as_ref().unwrap_or(&"Unnamed MESH".to_string()));
    //     let n_cells = ijk.i * ijk.j * ijk.k;
    //     let quantity_cell = Cell::new(&n_cells.to_formatted_string(&Locale::en));
    //     let ijk_cell = Cell::new(&format!("{}-{}-{}", ijk.i, ijk.j, ijk.k));
    //     let dx = (xb.x2 - xb.x1) / (ijk.i as f64);
    //     let dy = (xb.y2 - xb.y1) / (ijk.j as f64);
    //     let dz = (xb.z2 - xb.z1) / (ijk.k as f64);
    //     let dxyz_cell = Cell::new(&format!("{:.2}-{:.2}-{:.2}", dx, dy, dz));
    //     let max_dx = if dx >= dy && dx >= dz {
    //         dx
    //     } else if dy >= dz {
    //         dy
    //     } else {
    //         dz
    //     };
    //     let min_dx = if dx <= dy && dx <= dz {
    //         dx
    //     } else if dy <= dz {
    //         dy
    //     } else {
    //         dz
    //     };
    //     let aspect_ratio_cell = Cell::new(&format!("{:.2}", max_dx / min_dx));
    //     table.add_row(Row::new(vec![
    //         n_cell,
    //         id_cell,
    //         quantity_cell,
    //         ijk_cell,
    //         dxyz_cell,
    //         aspect_ratio_cell,
    //     ]));
    //     n_cells_total += n_cells as u64;
    // }
    // table.add_row(Row::new(vec![
    //     Cell::new("Total"),
    //     Cell::new(""),
    //     Cell::new(&n_cells_total.to_formatted_string(&Locale::en)),
    //     Cell::new(""),
    //     Cell::new(""),
    //     Cell::new(""),
    // ]));
    // table.printstd();
  })
  // Update Threadway Send
  .command("plot-hrr", "Plot the HRR")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  // Get Threadway
  .command("show-hrr", "Plot and show the HRR")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  // Get Aff-Docs
  .command("peak-hrr", "Print the highest HRR value from available data")
  .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("verify-input", "Copy input and relevant output files.")
  // .option("-f, --foo", "Foo option.")
  .arguments("<input-path:string>")
  .action(async (_options, ...args) => {
    const inputPath = args[0];
    const { title, typst } = await getInputTypst(inputPath);
    const tempFile = await Deno.makeTempFile({
      prefix: title,
      suffix: "_Verification.pdf",
    });
    try {
      await fdsInspect.renderTypstPdf(tempFile, typst);
      await open(tempFile);
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  })
  .command("plot", "plot.")
  .action(async () => {
  })
  .command("verify", "Verify both the input and the output")
  // .option("--master", "Pull the master branch version.")
  .arguments("<output-path:string>")
  .action(async (_options, ...args) => {
    const inputPath = args[0];
    const smvData = await fdsInspect.getJsonSmv(inputPath);
    const hrrData = await smvData.getHrr();
    let hrrPlotFile;
    if (hrrData) {
      {
        hrrPlotFile = await Deno.makeTempFile({ dir: ".", suffix: ".png" });
        await plotHRRDV(
          hrrPlotFile,
          hrrData,
          "Realised Heat Release Rate",
          undefined,
          {
            hrrSpec: {
              type: "simple",
              tau_q: -300,
              peak: 1000,
            },
          },
        );
      }
    }

    const dirPath = path.dirname(inputPath);
    const inPath = path.join(dirPath, smvData.input_file);
    const { title, typst } = await getInputTypst(inPath, hrrPlotFile);
    const tempFile = await Deno.makeTempFile({
      prefix: title,
      suffix: "_Verification.pdf",
    });
    try {
      await fdsInspect.renderTypstPdf(tempFile, typst);
      await open(tempFile);
      if (hrrPlotFile) {
        await Deno.remove(hrrPlotFile);
      }
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  })
  .command("rename", "Rename a simulation")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command(
    "compare",
    "Compare data vectors from multiple different simulations",
  )
  .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("new-rev", "Create a new revision of a simulation")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("current-progress", "Output the current progress of the simulation")
  .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("chart", "Compile a summary of information")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("read-out", "Read .out info")
  .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .command("hrr-vector", "Output HRR vector")
  // .option("--master", "Pull the master branch version.")
  .arguments("<input-path:string>")
  .action(async () => {
    // const fdsFile = await getJson(args[0]);
  })
  .parse(Deno.args);

async function getInputTypst(
  inputPath: string,
  hrrPlotFile?: string,
): Promise<{ title: string; typst: string }> {
  const fdsData = await fdsInspect.getJsonTemp(inputPath);
  let typst;
  let title = path.basename(inputPath, ".fds");
  if (fdsData.success) {
    title = fdsData.data.chid;
    const verificationSummary = await fdsInspectCore.verifyInput(
      fdsInspectCore.stdTestList,
      fdsData.data,
    );
    const inputSummary = fdsInspectCore.summary.summarise_input(fdsData.data);
    typst = fdsInspect.renderVerificationTypst(
      inputSummary,
      verificationSummary,
      hrrPlotFile,
    );
  } else {
    typst = fdsInspect.renderTypstErrorMessage(
      title,
      fdsData.error,
    );
  }
  return { title, typst };
}
