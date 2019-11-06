import execa from "execa";
import program from "commander";
import ora from "ora";
import Octokit from "@octokit/rest";
import fetch from "node-fetch";
const chalk = require("chalk");
const git = require("simple-git")();
const version = require("../package.json").version;

const repo = { origin: "", upstream: "", name: "" };

const getRepo = async () => {
  return new Promise((resolve) => {
    if (repo.name) {
      resolve(repo);
    } else {
      const regex = /^git@github.com:(.*)\/(.*).git$/;
      git.getRemotes(true, (err: any, result: any) => {
        if (err) process.exit(5);
        const originParsed = regex.exec(result.find((x: any) => x.name === "origin")?.refs.push);
        if (!originParsed) {
          console.log("Origin is not set");
          process.exit(1);
        }
        repo.origin = originParsed[1];
        repo.name = originParsed[2];
        const upstreamParsed = regex.exec(result.find((x: any) => x.name === "upstream")?.refs.push);
        if (!upstreamParsed) {
          console.log("Upstream is not set");
          process.exit(1);
        }
        repo.upstream = upstreamParsed[1];
        resolve(repo);
      });
    }
  });
};

const initializeGit = async () => {
  await getRepo();
  const octokit = new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN,
    userAgent: `github-cli v${version}`,
    previews: ["jean-grey", "symmetra"],
    timeZone: "Asia/Seoul",
    baseUrl: "https://api.github.com",
    log: {
      debug: () => { },
      info: () => { },
      warn: console.warn,
      error: console.error
    },
  });

  return octokit;
};

const getCurrentBranchName = async () => {
  const spinner = ora("get current branch name...").start();
  return new Promise<string>((resolve) => {
    git.branch([], (err: any, result: { current: string }) => {
      if (err) {
        spinner.fail();
        process.exit(1);
      } else {
        spinner.text = "get current branch name... " + chalk.yellow(result.current);
        spinner.succeed();
        resolve(result.current);
      }
    });
  });
};

const pushOrigin = async (branchName: string) => {
  const spinner = ora("git push origin " + chalk.yellow(branchName)).start();
  return new Promise((resolve) => {
    git.push(["origin", branchName], (err: any, result: any) => {
      if (err) {
        spinner.fail();
        process.exit(2);
      } else {
        spinner.succeed();
        resolve(result);
      }
    });
  });
};

const getJiraIssue = async (key: string) => {
  const spinner = ora("get jira issue of id " + chalk.yellow(key)).start();
  const result = await execa("jira", ["show", "-s", key]);
  if (result.failed || result.exitCode !== 0) {
    spinner.fail();
    process.exit(3);
  } else {
    spinner.succeed();
    console.log("└─", result.stdout);
    return result.stdout;
  }
};

const makePullRequest = async () => {
  const octokit = await initializeGit();
  const res = await octokit.pulls.create({
    owner: repo.upstream,
    repo: repo.name,
    title: "hmmmmmmmmmmmmmm",
    head: "minidonut:3823",
    base: "master"
  });
  console.log(res);
};


const list = async (...args: any) => {
  /* const current = await getCurrentBranchName(); */
  /* await getJiraIssue(current); */
  /* console.log(await getRepo()); */
  /* initializeGit(); */
  makePullRequest();
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
