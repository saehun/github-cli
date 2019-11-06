import execa from "execa";
import program from "commander";
import ora from "ora";
import * as inquirer from "inquirer";
import { notify, on } from "node-notifier";
import Octokit from "@octokit/rest";
const chalk = require("chalk");
const git = require("simple-git")();
const version = require("../package.json").version;


const repo = { origin: "", upstream: "", name: "" };
let stdoutBuffer = "";

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

const initializeGit = () => {
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
    console.log("Cannot find jira issue of id:", chalk.yellow(key));
    process.exit(3);
  } else {
    spinner.succeed();
    console.log("└─", result.stdout);
    return result.stdout;
  }
};

const makePullRequest = async (octokit: Octokit, repo: any, branch: string, title: string, base = "dev") => {
  const spinner = ora(`Generate pull request of [${chalk.yellow(repo.name)}] ${repo.origin}/${branch} -> ${repo.upstream}/${base}`).start();
  try {
    const res = await octokit.pulls.create({
      owner: repo.upstream,
      repo: repo.name,
      title: `[${branch}] ${title}`,
      head: `${repo.origin}:${branch}`,
      base,
    });
    spinner.succeed();
    return res.data;
  } catch (e) {
    console.log("Cannot make pull request", e);
    spinner.fail();
    process.exit(1);
  }
};

const deleteBranch = async (octokit: Octokit, repo: any, branch: string) => {
  const spinner = ora(`Delete [${chalk.yellow(repo.name)}] ${repo.origin}/${branch}`).start();
  try {
    const res = await octokit.git.deleteRef({
      owner: repo.origin,
      repo: repo.name,
      ref: branch,
    });
    spinner.succeed();
    return res.data;
  } catch (e) {
    spinner.fail();
    console.log("Fail to delete branch", branch);
  }
};

const findPullRequest = async (octokit: Octokit, branch: string, repo: any) => {
  const res = await octokit.pulls.list({
    owner: repo.upstream,
    repo: repo.name
  });

  const pr = res.data.find((x) => x.head.ref === branch);

  if (!pr) {
    console.error(`Cannot find any pull request of [${repo.name}] ${repo.origin}/${branch} -> ${repo.upstream}/...`);
    process.exit(1);
  } else {
    return pr;
  }
};

const getPullRequestByNumber = async (octokit: Octokit, repo: any, number: number) => {
  const res = await octokit.pulls.get({
    owner: repo.upstream,
    repo: repo.name,
    pull_number: number,
  });
  return res.data;
};

const getStatus = async (octokit: Octokit, repo: any, ref: string) => {
  const res = await octokit.repos.getCombinedStatusForRef({
    owner: repo.upstream,
    repo: repo.name,
    ref,
  });
  return res.data;
};

const pollingUntilMergeable = async (octokit: Octokit, repo: any, number: number) => {
  return new Promise((resolve) => {
    const handle = setInterval(async () => {
      const pr = await getPullRequestByNumber(octokit, repo, number);
      console.log("- get mergeable status:", pr.mergeable);
      if (pr.mergeable !== null) {
        if (pr.mergeable === false) {
          console.error("Cannot be merged. check\n", pr.html_url);
          process.exit(1);
        } else {
          clearInterval(handle);
          resolve(true);
        }
      }
    }, 3000);
  });
};

const printStatus = (statuses: any[]) => {
  return statuses.map(({ context, state }: { context: string, state: "pending" | "success" | "failure" }) => {
    return chalk[state === "pending" ? "yellow" : state === "success" ? "green" : "red"](context.replace(/ci\/circleci./, "").trim());
  }).join(" ");
};

const pollingUntilCIPass = async (octokit: Octokit, repo: any, sha: string, link: string) => {
  return new Promise((resolve) => {
    const spinner = ora("[CircleCI]").start();
    const handle = setInterval(async () => {
      const data = await getStatus(octokit, repo, sha);
      const state = data.state;
      spinner.text = "[CircleCI] " + printStatus(data.statuses);
      if (state !== "pending") {
        if (state === "failure") {
          spinner.fail();
          console.error("CirclCI failed. check\n", link);
          process.exit(1);
        } else {
          clearInterval(handle);
          spinner.succeed();
          resolve(true);
        }
      }
    }, 3000);
  });
};

const mergePullRequset = async (octokit: Octokit, repo: any, number: number, title: string,
  method: "merge" | "squash" | "rebase" = "squash") => {
  const res = await octokit.pulls.merge({
    owner: repo.upstream,
    repo: repo.name,
    pull_number: number,
    commit_title: title,
    merge_method: method,
  });

  return res.data;
};

const getJiraTodos = async () => {
  const res = await execa("jira", ["ls", "todo", "karl"]);
  stdoutBuffer = res.stdout;
  return;
};

const clearAll = async (octokit: Octokit, branch: string, issueTitle: string) => {

  const spinner = ora("Delete jira issue of id " + chalk.yellow(branch)).start();
  const result = await execa("jira", ["rm", branch, "-y"]);
  if (result.failed || result.exitCode !== 0) {
    spinner.fail();
    console.log("Cannot delete jira issue of id:", chalk.yellow(branch));
    process.exit(3);
  } else {
    spinner.succeed();
    await Promise.all([
      execa("gitreturn"),
      deleteBranch(octokit, repo, "heads/" + branch),
      getJiraTodos(),
    ]);
    console.log(stdoutBuffer);
    console.log("Take a rest..");

    notify({
      title: `Hou!!! All compeletee`,
      message: `[${branch}] ${issueTitle}`,
      sound: true,
      wait: true,
      timeout: 10,
    });
    process.exit(0);
  }

};


const yo = async () => {
  const branch = await getCurrentBranchName();
  const repo = await getRepo();
  const issueTitle = await getJiraIssue(branch);
  const octokit = initializeGit();

  await pushOrigin(branch);

  const result = await makePullRequest(octokit, repo, branch, issueTitle);

  console.log(result.html_url);
  console.log(result.url);

  notify({
    title: `Yo, PullRequest created`,
    message: `[${branch}] ${issueTitle}`,
    sound: true,
    wait: true,
    timeout: 10,
  });

  return branch;
};

const ho = async (command: any) => {
  const branch = typeof command === "string" ? command : await getCurrentBranchName();
  const repo = await getRepo();
  const octokit = initializeGit();
  const pr = await findPullRequest(octokit, branch, repo);
  await pollingUntilMergeable(octokit, repo, pr.number);
  await pollingUntilCIPass(octokit, repo, pr.head.sha, pr.html_url);

  notify({
    title: `Ho! All check is passed. you can merge now`,
    message: `[${branch}] ${pr.title}`,
    sound: true,
    wait: true,
    timeout: 10,
  });
};

const hou = async (command: any) => {
  const branch = await getCurrentBranchName();
  const ask = typeof command !== "string";

  const repo = await getRepo();
  const octokit = initializeGit();
  const pr = await findPullRequest(octokit, branch, repo);
  await mergePullRequset(octokit, repo, pr.number, pr.title);

  console.log(`Branch ${chalk.yellow(branch)} is successfully merged! Yohohou!`);
  if (ask) {
    inquirer.prompt({
      type: "confirm",
      message: `Delete JIRA issue and git branch ?`,
      name: "yes"
    }).then(async ({ yes }: any) => {
      if (yes) {
        clearAll(octokit, branch, pr.title);
      } else {
        console.log("Take a rest..");
      }
    });
  } else {
    clearAll(octokit, branch, pr.title);
  }
};

/**
 * CLI entry
 */
program
  .version(version, "-v, --version")
  .command("yo")
  .description("Yo!, create pull request")
  .action(yo);

program
  .command("ho")
  .description("Ho!, wait pull request mergeable")
  .action(ho);

program
  .command("hou")
  .description("Hou!, merge!")
  .action(hou);

program
  .command("yohohou")
  .description("Yo, Ho! Hou!!, create, merge, delete")
  .action(async () => {
    const branch = await yo();
    await ho(branch);
    await hou(branch);
  });

program.on("--help", function() {
  console.log("Examples:");
});

program.parse(process.argv);
