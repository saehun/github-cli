import * as execa from "execa";
import * as program from "commander";
import ora from "ora";
const chalk = require("chalk");
const git = require("simple-git")();
const version = require("../package.json").version;

const getCurrentBranchName = async () => {
  return new Promise<string>((resolve, reject) => {
    git.branch([], (err: any, result: { current: string }) => {
      if (err) reject(err); resolve(result.current);
    });
  });
};

const pushOrigin = async (branchName: string) => {
  const spinner = ora("git push origin" + chalk.cyan(branchName)).start();
  return new Promise((resolve, reject) => {
    git.push(["origin", branchName], (err: any, result: any) => {
      console.log(result);
      spinner.stop();
      if (err) reject(err); resolve(result);
    });
  });
};

const list = async (...args: any) => {
  const current = await getCurrentBranchName();
  console.log(current);
};

const push = async () => {
  const current = await getCurrentBranchName();
  await pushOrigin(current);
};

/**
 * CLI entry
 */
program
  .version(version, "-v, --version")
  .command("ls")
  .description("list issues")
  .action(list);

program
  .command("push")
  .description("list issues")
  .action(push);

program.on("--help", function() {
  console.log("Examples:");
});

program.parse(process.argv);
