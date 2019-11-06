import * as execa from "execa";
import * as program from "commander";
const git = require("simple-git")();
const version = require("../package.json").version;

const list = async (...args: any) => {
  const branch = git.branch([], (...args: any) => {
    console.log(args);
  });
};

/**
 * CLI entry
 */
program
  .version(version, "-v, --version")
  .command("ls")
  .description("list issues")
  .action(list);

program.on("--help", function() {
  console.log("Examples:");
});

program.parse(process.argv);
