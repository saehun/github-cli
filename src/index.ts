import * as execa from "execa";
import * as program from "commander";
const git = require("simple-git")();
const version = require("../package.json").version;

const getCurrentBranchName = async () => {
  return new Promise((resolve, reject) => {
    const branch = git.branch([], (...args: any) => {
      const current = args[1]?.current;
      if (current) {
        resolve(current);
      } else {
        reject("Unexpected Error");
      }
    });
  });
};



const list = async (...args: any) => {
  const current = await getCurrentBranchName();
  console.log(current);
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
