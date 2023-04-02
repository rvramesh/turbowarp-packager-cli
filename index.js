const fs = require("fs")
const path = require("path")
const AdmZip = require("adm-zip")
const Packager = require("@turbowarp/packager")
const { program } = require("commander")

// Define the command line arguments
program
  .requiredOption("-i, --input <inputFile>", "The input Scratch 3.0 project file (Required)")
  .requiredOption(
    "-o, --output <outputFolder>",
    "The output folder for the packaged project (Required)"
  )
  .option("-s, --settings <settingsFile>", "The settings file for the packager (Optional)")
  .parse(process.argv)

const args = program.opts()

// Check that all required arguments are present
if (!args.input || !args.output) {
  console.error("Please provide --input, --output, and optionally --settings arguments")
  process.exit(1)
}

args.settings = args.settings
  ? path.join("./", args.settings)
  : path.join(__dirname, "turbowarp-packager-settings.json")

// Read the settings from a JSON file
const settings = JSON.parse(fs.readFileSync(args.settings, "utf-8"))

//extractzip method accepts zip file and extracts it to the specified path
const extractzip = (zipPath, outputPath) => {
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(outputPath, true)
}

const run = async (inputPath, outputPath, settings) => {
  const projectData = await fs.promises.readFile(path.join("./", inputPath))
  const loadedProject = await Packager.loadProject(projectData)
  const packager = new Packager.Packager()
  packager.project = loadedProject
  packager.options = settings

  const result = await packager.package()

  let data = result.data
  if (data instanceof ArrayBuffer) {
    // If packager.options.target wasn't "html", data will be an ArrayBuffer instead of a string.
    // Node.js filesystem API doesn't like ArrayBuffers, so we'll convert it to something it understands.
    data = new Uint8Array(data)
  }
  const extension = result.type === "text/html" ? ".html" : ".zip"
  const outputDir = path.join("./", outputPath)

  if (!fs.existsSync(outputDir)) {
    fs.promises.mkdir(outputDir, { recursive: true })
  }
  const file = path.join(outputDir, "demo_output" + extension)
  await fs.promises.writeFile(file, data)
  console.log(`Wrote ${file} (${data.length} bytes)`)
  if (extension === ".zip") {
    extractzip(file, outputDir)
    await fs.promises.unlink(file)
  }
}

run(args.input, args.output, settings).catch((err) => {
  console.error(err)
  process.exit(1)
})
